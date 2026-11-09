import { API_URL } from './config';

// REST client for /api/v1 with a Bearer token (SDD 8.3). Mirrors apps/web/src/api/client.js:
// same envelope ({ data } or { error: { code, message, fields } }) and the same error messages.
export class ApiError extends Error {
  constructor(status, code, message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let token = null;
let onUnauthorized = () => {};
const cache = new Map();

export function setToken(value) { token = value; }
export function setUnauthorizedHandler(handler) { onUnauthorized = handler; }
export function clearCache() { cache.clear(); }

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', `Không thể kết nối máy chủ (${API_URL}).`);
  }

  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Máy chủ trả dữ liệu không hợp lệ.');
  }

  if (!response.ok) {
    // A revoked or expired session: drop the local token and go back to login (FR-M14-04).
    if (response.status === 401 && path !== '/auth/login') onUnauthorized();
    const error = payload?.error;
    throw new ApiError(response.status, error?.code ?? 'REQUEST_FAILED', error?.message ?? 'Yêu cầu không thành công.', error?.fields ?? null);
  }

  return payload?.data ?? payload;
}

// GET with an in-memory cache for the session (NFR-17: forecasts change once a day, so screens reuse
// what they already loaded; pull-to-refresh passes refresh=true). Cleared on login and logout.
export async function cachedGet(path, { refresh = false } = {}) {
  if (!refresh && cache.has(path)) return cache.get(path);
  const data = await request(path);
  cache.set(path, data);
  return data;
}
