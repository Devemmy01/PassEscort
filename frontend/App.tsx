// Per-weight subpaths: importing the package root would bundle all 18 Inter faces (~6 MB).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigator } from './src/navigation/Navigator';
import { SCREENS } from './src/navigation/screens';
import { AppStateProvider, DEMO_AMBASSADOR, DEMO_PROFILE, NEW_PROFILE } from './src/state/AppState';
import { readWebEntry } from './src/navigation/webEntry';
import { DeepLinks } from './src/navigation/DeepLinks';
import { NotificationRouter } from './src/navigation/NotificationRouter';
import { loadContent } from './src/content/questionStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Content the server added since this build (synced earlier), merged into the on-device bank.
void loadContent();
SplashScreen.setOptions({ duration: 300, fade: true });

// Web review links (?route=…) and EXPO_PUBLIC_START=prototype open the design prototype on demo data;
// everything else is the real app, signed in against the API.
const START_PROTOTYPE = process.env.EXPO_PUBLIC_START === 'prototype';
const entry = readWebEntry(START_PROTOTYPE ? 'Prototype' : 'Splash');
const demo = START_PROTOTYPE || entry.route !== 'Splash';
const preset = entry.profile === 'new' ? NEW_PROFILE : entry.profile === 'ambassador' ? DEMO_AMBASSADOR : DEMO_PROFILE;
const initialState = entry.offline ? { ...preset, online: false } : preset;

export default function App() {
  // Keys must match fontFamilies in src/theme/tokens.ts.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    // Hold the native splash until Inter is ready (or failed, in which case the
    // system font is used), then hand over to the in-app Splash route.
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppStateProvider initial={demo ? initialState : undefined} mode={demo ? 'demo' : 'live'}>
        <Navigator screens={SCREENS} initial={entry.route} initialParams={entry.params}>
          <DeepLinks />
          <NotificationRouter />
        </Navigator>
        <StatusBar style="dark" />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
