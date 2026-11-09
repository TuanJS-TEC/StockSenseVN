// Web preview only (`npm run web`, for quick checks in a browser): a browser has no Keychain/Keystore,
// so the token stays in sessionStorage and is gone when the tab closes. iOS and Android use tokenStore.js.
const KEY = 'stocksense.session';

function storage() {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

export const tokenStore = {
  async get() { try { return storage()?.getItem(KEY) ?? null; } catch { return null; } },
  async set(value) { try { storage()?.setItem(KEY, value); } catch { /* storage blocked: session stays in memory */ } },
  async clear() { try { storage()?.removeItem(KEY); } catch { /* nothing stored */ } },
};
