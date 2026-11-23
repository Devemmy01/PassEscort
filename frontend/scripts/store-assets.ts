/**
 * Store listing assets (WK 07 / WK 13), rendered from the real app screens.
 *
 *   npm run store:assets
 *
 * 1. Exports the app for web and serves it with the COEP/COOP headers
 *    expo-sqlite needs.
 * 2. Opens each screen in headless Chrome (DevTools protocol) through the
 *    web-only deep link (src/navigation/webEntry.ts) and captures it twice:
 *    as a phone (390×844 at 3×) and as a 13" iPad (1032×1376 at 2×).
 * 3. Composes captioned store frames and the Play feature graphic in Chrome,
 *    with Inter from node_modules, so the type matches the app.
 *
 * Output (committed, ~10 MB): docs/store/play/*.png (1080×1920 phone
 * screenshots, 1024×500 feature graphic, 512×512 icon), docs/store/ios/*.png
 * (1320×2868, App Store 6.9" iPhone) and docs/store/ipad/*.png (2064×2752,
 * App Store 13" iPad). Needs a local Chrome/Chromium (CHROME_PATH to
 * override). Copy for the listing itself: docs/store/LISTING.md.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { AMBASSADOR_RULES } from '../src/game/referral';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION } from '../src/practice/types';
import { CBT_QUESTION_COUNT, CBT_SECONDS } from '../src/practice/questions';
import { palette } from '../src/theme/tokens';

const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '..', 'docs', 'store');

interface Shot {
  name: string;
  route: string;
  params?: unknown;
  profile?: 'demo' | 'new' | 'ambassador';
  offline?: boolean;
  /** ms to wait after load (timers, celebrations). */
  wait?: number;
  /** Visible button labels to press, in order, before capturing. */
  press?: string[];
  headline: string;
  sub: string;
}

const SHOTS: Shot[] = [
  { name: '01-home', route: 'Home', headline: 'Your daily exam plan', sub: 'Streaks, XP and a goal that fits your day' },
  {
    name: '02-cbt',
    route: 'CbtSession',
    params: { subject: 'Physics' },
    headline: 'JAMB CBT, just like exam day',
    sub: `${CBT_QUESTION_COUNT} questions, ${CBT_SECONDS / 60} minutes, a real timer`,
  },
  {
    name: '03-theory',
    route: 'WaecSession',
    params: { subject: 'Mathematics', examBody: 'WAEC', tab: 'theory' },
    // Free plan: step 1 is free, then the gold "Unlock full solutions" gate (PRD §5.8) — shown as it really is.
    press: ['Show step-by-step'],
    headline: 'WAEC & NECO, step by step',
    sub: 'See the working behind every mark',
  },
  {
    name: '04-ai',
    route: 'AiExplain',
    params: { questionId: 'jamb-math-algebra-2', state: 'explanation' },
    headline: 'Stuck? Passy explains it',
    sub: 'Plain-English steps for tricky questions',
  },
  {
    name: '05-duel',
    route: 'DuelBattle',
    params: { subject: 'Mathematics', opponentIndex: 0 },
    wait: 4500,
    headline: 'Duel your friends live',
    sub: `${DUEL_ROUNDS} questions · ${DUEL_SECONDS_PER_QUESTION} seconds each · winner takes XP`,
  },
  { name: '06-offline', route: 'PracticeHub', offline: true, headline: 'Works offline. No data wahala.', sub: 'Download once, practise anywhere' },
  { name: '07-level', route: 'LevelUp', params: { level: 15 }, wait: 3000, headline: 'From Novice to UTME Legend', sub: 'Level up, earn badges, keep your streak' },
  {
    name: '08-ambassador',
    route: 'Ambassador',
    profile: 'ambassador',
    headline: 'Earn while you study',
    sub: `Ambassadors earn ${Math.round(AMBASSADOR_RULES.commissionRate * 100)}% when friends subscribe`,
  },
];

/** Viewports the screens are captured at (CSS px × scale). */
const DEVICES = {
  phone: { width: 390, height: 844, scale: 3, dir: 'screens' },
  tablet: { width: 1032, height: 1376, scale: 2, dir: 'screens-tablet' },
} as const;
type Device = keyof typeof DEVICES;

const FORMATS: readonly { dir: string; width: number; height: number; device: Device }[] = [
  { dir: 'play', width: 1080, height: 1920, device: 'phone' },
  { dir: 'ios', width: 1320, height: 2868, device: 'phone' },
  { dir: 'ipad', width: 2064, height: 2752, device: 'tablet' },
];

/* ------------------------------------------------------------------ */
/* Static server and Chrome over the DevTools protocol                 */
/* ------------------------------------------------------------------ */

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

function serve(dir: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]!);
    let file = join(dir, path);
    // SPA fallback for the app; anything else that is missing (e.g. /favicon.ico on a compose page) is a 404.
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    if (!existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: (server.address() as { port: number }).port })));
}

function findChrome(): string {
  const found = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .filter(Boolean)
    .find((c) => existsSync(c!));
  if (!found) throw new Error('No Chrome/Chromium found — set CHROME_PATH.');
  return found;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openChrome(profileDir: string) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profileDir}`, `--remote-debugging-port=${port}`, 'about:blank'], {
    stdio: 'ignore',
  });
  let wsUrl: string | undefined;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(200);
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
  }
  if (!wsUrl) throw new Error('Chrome did not start');
  const ws = new WebSocket(wsUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let id = 0;
  const pending = new Map<number, (m: { result?: any; error?: { message: string } }) => void>();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m);
      pending.delete(m.id);
    }
  });
  const send = (method: string, params: object = {}): Promise<any> =>
    new Promise((ok, fail) => {
      const i = ++id;
      pending.set(i, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  const close = () => {
    ws.close();
    proc.kill();
  };
  return { send, close };
}

type Send = Awaited<ReturnType<typeof openChrome>>['send'];

async function capture(send: Send, url: string, width: number, height: number, scale: number, file: string, waitMs: number, press: string[] = []) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
  await send('Page.navigate', { url });
  await sleep(waitMs);
  for (const label of press) {
    // RN-web Pressables respond to pointer events, not element.click(): find the
    // visible button by its text and tap its centre like a finger would.
    const found = await send('Runtime.evaluate', {
      expression: `(() => { const el = [...document.querySelectorAll('[role="button"],button')].find((e) => e.innerText.trim() === ${JSON.stringify(label)} && e.getBoundingClientRect().height > 0); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      returnByValue: true,
    });
    const at = found.result?.value as { x: number; y: number } | null;
    if (!at) throw new Error(`No button "${label}" on ${url}`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'] as const) {
      await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    }
    await sleep(700);
  }
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
}

/* ------------------------------------------------------------------ */
/* Composition pages                                                   */
/* ------------------------------------------------------------------ */

const FONT_FACES = (['400Regular', '500Medium', '600SemiBold', '700Bold'] as const)
  .map((w) => `@font-face{font-family:Inter;font-weight:${w.slice(0, 3)};src:url(fonts/Inter_${w}.ttf)}`)
  .join('');

/** 13" iPad frame: portrait tablet, caption above, device bleeding off the bottom edge. */
function tabletFrameHtml(shot: Shot, width: number, height: number): string {
  const u = width / 2064;
  const bezel = Math.round(40 * u);
  const deviceW = Math.round(width * 0.8);
  const screenW = deviceW - bezel * 2;
  const screenH = Math.round((screenW * DEVICES.tablet.height) / DEVICES.tablet.width);
  const top = Math.round(height * 0.2);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACES}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:Inter}
body{background:radial-gradient(120% 60% at 85% 0%, rgba(29,130,248,.55), rgba(29,130,248,0) 60%), linear-gradient(180deg, ${palette.navy900}, ${palette.navy950});}
.copy{position:absolute;left:${160 * u}px;right:${160 * u}px;top:${150 * u}px;color:#fff;text-align:center}
h1{margin:0;font-weight:700;font-size:${120 * u}px;line-height:1.08;letter-spacing:${-2 * u}px;text-wrap:balance}
p{margin:${28 * u}px 0 0;font-weight:500;font-size:${54 * u}px;line-height:1.3;color:${palette.sky100};text-wrap:balance}
.device{position:absolute;left:${(width - deviceW) / 2}px;top:${top}px;width:${deviceW}px;height:${screenH + bezel * 2}px;border-radius:${90 * u}px;background:#0B1220;box-shadow:0 0 0 ${4 * u}px rgba(255,255,255,.12)}
.device img{position:absolute;left:${bezel}px;top:${bezel}px;width:${screenW}px;height:${screenH}px;border-radius:${52 * u}px;object-fit:cover}
</style></head><body><div class="copy"><h1>${shot.headline}</h1><p>${shot.sub}</p></div><div class="device"><img src="${DEVICES.tablet.dir}/${shot.name}.png"></div></body></html>`;
}

function storeFrameHtml(shot: Shot, width: number, height: number): string {
  const u = width / 1080; // layout unit: 1 = 1px on the Play frame
  const phoneW = Math.round(820 * u);
  const screenW = phoneW - Math.round(36 * u);
  const screenH = Math.round((screenW * 844) / 390);
  const top = Math.round(height * 0.255);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACES}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:Inter}
body{background:radial-gradient(120% 60% at 85% 0%, rgba(29,130,248,.55), rgba(29,130,248,0) 60%), linear-gradient(180deg, ${palette.navy900}, ${palette.navy950});}
.copy{position:absolute;left:${88 * u}px;right:${88 * u}px;top:${118 * u}px;color:#fff}
h1{margin:0;font-weight:700;font-size:${82 * u}px;line-height:1.08;letter-spacing:${-1.5 * u}px;text-wrap:balance}
p{margin:${24 * u}px 0 0;font-weight:500;font-size:${38 * u}px;line-height:1.3;color:${palette.sky100};text-wrap:balance}
.phone{position:absolute;left:${(width - phoneW) / 2}px;top:${top}px;width:${phoneW}px;height:${screenH + 36 * u}px;border-radius:${84 * u}px;background:#0B1220;box-shadow:0 0 0 ${3 * u}px rgba(255,255,255,.12)}
.phone img{position:absolute;left:${18 * u}px;top:${18 * u}px;width:${screenW}px;height:${screenH}px;border-radius:${68 * u}px;object-fit:cover}
</style></head><body><div class="copy"><h1>${shot.headline}</h1><p>${shot.sub}</p></div><div class="phone"><img src="screens/${shot.name}.png"></div></body></html>`;
}

function featureGraphicHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACES}
html,body{margin:0;width:1024px;height:500px;overflow:hidden;font-family:Inter}
body{background:radial-gradient(70% 90% at 78% 30%, rgba(29,130,248,.6), rgba(29,130,248,0) 65%), linear-gradient(135deg, ${palette.navy900}, ${palette.navy950})}
.lockup{position:absolute;left:64px;top:64px;height:52px}
h1{position:absolute;left:64px;top:150px;width:470px;margin:0;color:#fff;font-weight:700;font-size:54px;line-height:1.08;letter-spacing:-1px;text-wrap:balance}
p{position:absolute;left:64px;top:330px;width:440px;margin:0;color:${palette.sky100};font-weight:500;font-size:24px;line-height:1.35;text-wrap:balance}
/* Passy sits between the copy (ends at x=504) and the phone (starts at x=772). */
.passy{position:absolute;left:530px;bottom:-6px;width:230px}
.phone{position:absolute;right:52px;top:46px;width:200px;height:433px;border-radius:30px;background:#0B1220;box-shadow:0 0 0 2px rgba(255,255,255,.14)}
.phone img{position:absolute;left:9px;top:9px;width:182px;height:394px;border-radius:24px;object-fit:cover}
</style></head><body><img class="lockup" src="brand/lockup-white.png"><h1>Pass JAMB, WAEC &amp; NECO</h1>
<p>Practice questions with answers, timed CBT and quiz duels. Works offline.</p>
<div class="phone"><img src="screens/01-home.png"></div><img class="passy" src="passy/trophy.png"></body></html>`;
}

/* ------------------------------------------------------------------ */

async function main() {
  const work = mkdtempSync(join(tmpdir(), 'passescort-store-'));
  const webDir = join(work, 'web');
  const compose = join(work, 'compose');
  for (const d of [DEVICES.phone.dir, DEVICES.tablet.dir, 'fonts', 'brand', 'passy']) mkdirSync(join(compose, d), { recursive: true });
  for (const f of FORMATS) mkdirSync(join(OUT, f.dir), { recursive: true });

  console.log('• exporting the app for web…');
  const exp = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', webDir], { cwd: ROOT, stdio: 'inherit' });
  if (exp.status !== 0) throw new Error('expo export failed');

  for (const w of ['400Regular', '500Medium', '600SemiBold', '700Bold']) {
    copyFileSync(join(ROOT, 'node_modules/@expo-google-fonts/inter', w, `Inter_${w}.ttf`), join(compose, 'fonts', `Inter_${w}.ttf`));
  }
  copyFileSync(join(ROOT, 'assets/brand/lockup-white.png'), join(compose, 'brand/lockup-white.png'));
  copyFileSync(join(ROOT, 'assets/passy/trophy.png'), join(compose, 'passy/trophy.png'));

  const app = await serve(webDir);
  const comp = await serve(compose);
  const chrome = await openChrome(join(work, 'chrome'));
  try {
    for (const shot of SHOTS) {
      const q = new URLSearchParams({ route: shot.route });
      if (shot.params !== undefined) q.set('params', JSON.stringify(shot.params));
      if (shot.profile) q.set('profile', shot.profile);
      if (shot.offline) q.set('offline', '1');
      for (const d of Object.values(DEVICES)) {
        await capture(chrome.send, `http://127.0.0.1:${app.port}/?${q}`, d.width, d.height, d.scale, join(compose, d.dir, `${shot.name}.png`), shot.wait ?? 2500, shot.press);
      }
      console.log(`✓ screen ${shot.name} (phone + iPad)`);
    }
    for (const fmt of FORMATS) {
      for (const shot of SHOTS) {
        const page = `${fmt.dir}-${shot.name}.html`;
        writeFileSync(join(compose, page), fmt.device === 'tablet' ? tabletFrameHtml(shot, fmt.width, fmt.height) : storeFrameHtml(shot, fmt.width, fmt.height));
        await capture(chrome.send, `http://127.0.0.1:${comp.port}/${page}`, fmt.width, fmt.height, 1, join(OUT, fmt.dir, `${shot.name}.png`), 600);
      }
      console.log(`✓ ${SHOTS.length} ${fmt.dir} screenshots (${fmt.width}×${fmt.height})`);
    }
    writeFileSync(join(compose, 'feature.html'), featureGraphicHtml());
    await capture(chrome.send, `http://127.0.0.1:${comp.port}/feature.html`, 1024, 500, 1, join(OUT, 'play', 'feature-graphic.png'), 600);
    console.log('✓ play/feature-graphic.png (1024×500)');
    writeFileSync(join(compose, 'icon.html'), `<!doctype html><html><body style="margin:0"><img src="icon.png" style="width:512px;height:512px;display:block"></body></html>`);
    copyFileSync(join(ROOT, 'assets/icon.png'), join(compose, 'icon.png'));
    await capture(chrome.send, `http://127.0.0.1:${comp.port}/icon.html`, 512, 512, 1, join(OUT, 'play', 'icon-512.png'), 400);
    console.log('✓ play/icon-512.png (512×512)');
  } finally {
    chrome.close();
    app.server.close();
    comp.server.close();
    await sleep(300);
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
