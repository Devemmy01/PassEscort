/**
 * Regenerates the app icon, Android adaptive icon layers, splash image and
 * favicon from the Figma logomark, redrawn as vectors in src/brand/svg.ts.
 *
 *   npm run brand:assets
 *
 * Rasterises with a local headless Chrome/Chromium (set CHROME_PATH to
 * override). Output is committed, so this only needs re-running when the
 * logomark or brand colours change.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ICON_BACKGROUND, logomarkSvg } from '../src/brand/svg';

const ASSETS = resolve(__dirname, '..', 'assets');

interface Target {
  file: string;
  size: number;
  svg: string;
}

const solid = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color}"/></svg>`;

/*
 * Mark heights are a share of the square canvas. Android's adaptive-icon safe
 * zone is a 66dp circle in a 108dp canvas (61%); the mark's diagonal is 1.26×
 * its height, so 0.44 keeps every corner inside the circle on any mask shape.
 */
const TARGETS: Target[] = [
  // iOS / store icon: opaque and full-bleed, no rounded corners — the OS masks it.
  { file: 'icon.png', size: 1024, svg: logomarkSvg({ background: ICON_BACKGROUND, backgroundRadius: 0, scale: 0.56 }) },
  // Android adaptive icon layers (same 1024 dimensions, as Expo requires).
  { file: 'android-icon-foreground.png', size: 1024, svg: logomarkSvg({ scale: 0.44 }) },
  { file: 'android-icon-background.png', size: 1024, svg: solid(ICON_BACKGROUND) },
  { file: 'android-icon-monochrome.png', size: 1024, svg: logomarkSvg({ monochrome: '#FFFFFF', scale: 0.44 }) },
  // Splash: transparent mark only; expo-splash-screen paints SPLASH_BACKGROUND (#F8FAFC) behind it.
  { file: 'splash-icon.png', size: 1024, svg: logomarkSvg({ scale: 0.9 }) },
  { file: 'favicon.png', size: 48, svg: logomarkSvg({ background: ICON_BACKGROUND, scale: 0.7 }) },
];

function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean) as string[];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error('No Chrome/Chromium found — set CHROME_PATH.');
  return found;
}

function main() {
  const chrome = findChrome();
  const work = mkdtempSync(join(tmpdir(), 'passescort-brand-'));
  try {
    for (const t of TARGETS) {
      const html = join(work, `${t.file}.html`);
      writeFileSync(
        html,
        `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${t.size}px;height:${t.size}px}</style></head><body>${t.svg}</body></html>`,
      );
      execFileSync(
        chrome,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--force-device-scale-factor=1',
          '--default-background-color=00000000',
          `--window-size=${t.size},${t.size}`,
          `--screenshot=${join(ASSETS, t.file)}`,
          `file://${html}`,
        ],
        { stdio: 'ignore' },
      );
      console.log(`✓ assets/${t.file} (${t.size}×${t.size})`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
