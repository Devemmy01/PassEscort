import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { config } from '../config';
import { firebaseApp, firebaseService, signInWithGoogleIdToken, type GoogleFlow } from './firebaseCore';

// The React Native build of @firebase/auth (resolved by Metro's "react-native"
// export condition) provides AsyncStorage persistence, so students stay signed
// in between launches. Its types aren't in the default typings, hence the cast.
const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let auth: Auth | undefined;
function nativeAuth(): Auth {
  if (auth) return auth;
  try {
    auth = initializeAuth(firebaseApp(), { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    auth = getAuth(firebaseApp()); // already initialised (fast refresh)
  }
  return auth;
}

/** Google account picker (native) → Google ID token → Firebase credential. */
const google: GoogleFlow | null = config.googleWebClientId
  ? async (a) => {
      GoogleSignin.configure({ webClientId: config.googleWebClientId });
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch {
        throw Object.assign(new Error('Play services unavailable'), { code: 'google/play-services' });
      }
      try {
        const res = await GoogleSignin.signIn();
        if (!isSuccessResponse(res) || !res.data.idToken) return null;
        return await signInWithGoogleIdToken(a, res.data.idToken);
      } catch (e) {
        if ((e as { code?: string })?.code === statusCodes.SIGN_IN_CANCELLED) return null;
        throw e;
      }
    }
  : null;

export const firebaseAuth = () => firebaseService(nativeAuth(), google);
