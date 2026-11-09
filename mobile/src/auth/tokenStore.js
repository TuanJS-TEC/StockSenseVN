import * as SecureStore from 'expo-secure-store';

// FR-M14-04: the session token lives in the iOS Keychain or the Android Keystore (via expo-secure-store),
// never in plain app storage. Stored value: {"token": "...", "expiresAt": <epoch ms>}.
const KEY = 'stocksense.session';

export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (value) => SecureStore.setItemAsync(KEY, value),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
