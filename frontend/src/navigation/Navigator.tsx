import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import type { TabKey } from '../components/Layout';
import { TAB_ROUTES, type RouteName, type Routes } from './routes';

/**
 * Minimal typed stack navigator for the prototype — no extra dependency and
 * nothing to configure. Swap for expo-router when the app shell is built; the
 * route table in routes.ts maps 1:1 onto file-based routes.
 */
type ParamArgs<K extends RouteName> = undefined extends Routes[K] ? [params?: Routes[K]] : [params: Routes[K]];

type Entry = { [K in RouteName]: { key: number; name: K; params: Routes[K] } }[RouteName];

export interface Nav {
  push: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  replace: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  /** Clear the stack back to the Prototype index (if present) and open `name`. */
  reset: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  back: () => void;
  goTab: (tab: TabKey) => void;
  canGoBack: boolean;
}

const NavContext = createContext<Nav | null>(null);

export type ScreenRegistry = { [K in RouteName]: ComponentType<{ params: Routes[K] }> };

export function Navigator({
  screens,
  initial,
  initialParams,
  children,
}: {
  screens: ScreenRegistry;
  initial: Entry['name'];
  initialParams?: unknown;
  /** Rendered inside the navigation context (deep-link handling). */
  children?: ReactNode;
}) {
  const nextKey = useRef(1);
  const [stack, setStack] = useState<Entry[]>([{ key: 0, name: initial, params: initialParams } as Entry]);

  const make = useCallback((name: RouteName, params: unknown): Entry => ({ key: nextKey.current++, name, params }) as Entry, []);

  const depth = useRef(1);
  depth.current = stack.length;

  // Stable identity: screens can safely list `nav` as an effect dependency.
  const nav = useMemo<Nav>(
    () => ({
      push: (name, ...p) => setStack((s) => [...s, make(name, p[0])]),
      replace: (name, ...p) => setStack((s) => [...s.slice(0, -1), make(name, p[0])]),
      reset: (name, ...p) =>
        setStack((s) => {
          const root = s[0]?.name === 'Prototype' ? [s[0]] : [];
          return [...root, make(name, p[0])];
        }),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      goTab: (tab) =>
        setStack((s) => {
          const target = TAB_ROUTES[tab];
          const tabNames = Object.values(TAB_ROUTES);
          let base = s;
          while (base.length > 1 && !tabNames.includes(base[base.length - 1].name)) base = base.slice(0, -1);
          if (base.length > 0 && tabNames.includes(base[base.length - 1].name)) base = base.slice(0, -1);
          return [...base, make(target, undefined)];
        }),
      get canGoBack() {
        return depth.current > 1;
      },
    }),
    [make],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth.current > 1) {
        nav.back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [nav]);

  // Every screen in the stack stays mounted (like a native stack) so going
  // back restores scroll position and local state; only the top is visible.
  return (
    <NavContext.Provider value={nav}>
      {stack.map((entry, i) => {
        const ScreenComponent = screens[entry.name] as ComponentType<{ params: unknown }>;
        const top = i === stack.length - 1;
        return (
          <View key={entry.key} style={[StyleSheet.absoluteFill, top ? null : styles.hidden]} aria-hidden={!top}>
            <ScreenComponent params={entry.params} />
          </View>
        );
      })}
      {children}
    </NavContext.Provider>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
});

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav must be used inside <Navigator>');
  return nav;
}
