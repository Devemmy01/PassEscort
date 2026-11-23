import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with build-time options that come from the environment.
 *
 * Google sign-in (Firebase): the native module's config plugin is required on
 * iOS and refuses to build without the iOS client's reversed ID, so it's added
 * only when EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is set ("com.googleusercontent.apps.…",
 * from GoogleService-Info.plist → REVERSED_CLIENT_ID). Android needs no plugin.
 *
 * Push (FCM): Android builds need the Firebase project's google-services.json
 * (GOOGLE_SERVICES_JSON, a path — EAS file secret in CI).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const easProjectId = process.env.EAS_PROJECT_ID;
  return {
    ...(config as ExpoConfig),
    // Push tokens are scoped to the EAS project (`eas init` prints its id).
    extra: { ...config.extra, ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins: [...(config.plugins ?? []), ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, unknown]] : [])],
  };
};
