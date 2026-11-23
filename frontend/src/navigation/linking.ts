import { config } from '../config';

export type DeepLink = { kind: 'duel'; code: string } | { kind: 'referral'; code: string } | null;

/**
 * Understands both forms of PassEscort links:
 *   https://passescort.app/d/K7QM2X   (shared on WhatsApp; opens the app via App Links / Universal Links)
 *   passescort://d/K7QM2X             (custom scheme)
 * /d/ is a duel invite, /r/ a friend's referral code.
 */
export function parseDeepLink(url: string | null | undefined): DeepLink {
  if (!url) return null;
  let path = '';
  const host = config.linkHost.replace(/^https?:\/\//, '');
  const web = url.match(/^https?:\/\/([^/]+)(\/[^?#]*)/);
  if (web) {
    if (web[1] !== host) return null;
    path = web[2]!;
  } else if (url.startsWith(`${config.scheme}://`)) {
    path = `/${url.slice(config.scheme.length + 3).split(/[?#]/)[0]}`;
  } else return null;
  const m = path.match(/^\/(d|r)\/([A-Za-z0-9]{4,10})\/?$/);
  if (!m) return null;
  const code = m[2]!.toUpperCase();
  return m[1] === 'd' ? { kind: 'duel', code } : { kind: 'referral', code };
}
