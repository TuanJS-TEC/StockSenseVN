import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Which API the app calls. EXPO_PUBLIC_API_URL wins (set it for a build that points at a fixed server).
// In development the app falls back to the computer that serves the bundle: Expo Go on a phone
// knows that host from hostUri (e.g. "192.168.1.10:8081"), and the API listens on port 3000 there.
function fallbackUrl() {
  if (Platform.OS === 'web') return `http://${globalThis.location?.hostname || 'localhost'}:3000`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:3000`;
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fallbackUrl()).replace(/\/+$/, '');
