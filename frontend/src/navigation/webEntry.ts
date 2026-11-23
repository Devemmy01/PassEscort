import { Platform } from 'react-native';
import type { RouteName } from './routes';
import { SCREENS } from './screens';

/**
 * Web-only deep link into any prototype screen:
 *   /?route=ShareCard&params={"card":{"kind":"streak","days":15}}&profile=new&offline=1
 * Used by design review links and by scripts/capture-store-assets.ts, which
 * screenshots real screens for the store listing. Native builds ignore it.
 */
export interface WebEntry {
  route: RouteName;
  params?: unknown;
  profile?: 'new' | 'demo' | 'ambassador';
  /** Start in the offline state (for reviewing offline designs). */
  offline?: boolean;
}

export function readWebEntry(fallback: RouteName): WebEntry {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { route: fallback };
  const q = new URLSearchParams(window.location.search);
  const route = q.get('route');
  if (!route || !(route in SCREENS)) return { route: fallback };
  let params: unknown;
  try {
    params = q.has('params') ? JSON.parse(q.get('params')!) : undefined;
  } catch {
    params = undefined;
  }
  const profile = q.get('profile');
  return {
    route: route as RouteName,
    params,
    profile: profile === 'new' || profile === 'demo' || profile === 'ambassador' ? profile : undefined,
    offline: q.get('offline') === '1',
  };
}
