import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence, signInWithPopup } from 'firebase/auth';
import { firebaseApp, firebaseService, type GoogleFlow } from './firebaseCore';

/** Web: Firebase's Google popup (no native module, no client ID needed). */
const google: GoogleFlow = async (auth) => {
  try {
    return (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/popup-closed-by-user') return null;
    throw e;
  }
};

/** Web (design review builds): browser persistence. Native uses firebaseAuth.native.ts. */
export const firebaseAuth = () => {
  const auth = getAuth(firebaseApp());
  setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  return firebaseService(auth, google);
};
