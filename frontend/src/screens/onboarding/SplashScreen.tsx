import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Logomark, useReduceMotion } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { useApp } from '../../state/AppState';
import { SPLASH_BACKGROUND } from '../../brand/svg';

const MOUNTAIN = require('../../../assets/brand/mountain.png');
const MOUNTAIN_ASPECT = 900 / 300;

/**
 * Native splash size (app.json → expo-splash-screen): a 110dp image box whose
 * mark fills 90% of its height. Matching it here makes the hand-off invisible.
 */
const MARK_HEIGHT = 99;

/**
 * Figma "01 — Splash Screen": the mark centred on the light background, with
 * the mountain-and-flag illustration rising from the bottom edge. The mark is
 * already in place from the native splash; only the mountain fades up.
 */
const MIN_SPLASH_MS = 1200;

export default function SplashScreen({ params }: { params: Routes['Splash'] }) {
  const nav = useNav();
  const app = useApp();
  const { width } = useWindowDimensions();
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [v]);

  // Route once the brand moment has played and we know who's signed in.
  useEffect(() => {
    if (!minElapsed) return;
    if (params?.next) {
      nav.replace(params.next);
      return;
    }
    if (app.mode !== 'live') {
      nav.replace('Welcome');
      return;
    }
    if (app.status === 'loading') return;
    if (app.status === 'signedOut') nav.replace('Welcome');
    else if (!app.state.onboarded) nav.replace('OnboardExam');
    else nav.replace('Home', app.state.progress.questionsAnswered === 0 ? { variant: 'new' } : undefined);
  }, [minElapsed, app.status, app.mode, app.state.onboarded, app.state.progress.questionsAnswered, params, nav]);

  const mountainWidth = Math.min(width, 480);
  return (
    <View style={styles.root}>
      <Logomark size={MARK_HEIGHT} />
      <Animated.View
        style={[
          styles.mountain,
          { opacity: v, transform: reduce ? [] : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
        ]}
      >
        <Image
          source={MOUNTAIN}
          style={{ width: mountainWidth, height: mountainWidth / MOUNTAIN_ASPECT }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  mountain: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
});
