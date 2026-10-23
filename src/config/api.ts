const rawEnvBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
// Automatically normalizes base URL:
// 1. Strips trailing slashes
// 2. Strips trailing '/api' so `${API_BASE_URL}/api/...` never produces duplicate `/api/api`
// 3. Defaults to 'https://api.paatam.in' in production if no env var is provided
export const API_BASE_URL = (
  rawEnvBase || (import.meta.env.PROD ? 'https://api.paatam.in' : '')
)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const TOKEN_KEY = 'paatam_jwt_access_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

// Global fetch enhancer:
// 1. Automatically strips double slashes from URLs (e.g. dev//api -> dev/api)
// 2. Injects 'ngrok-skip-browser-warning: true' header
// 3. Injects 'Authorization: Bearer <token>' if a token is stored
// 4. Enables credentials: 'include' for refresh token cookies
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Clean up accidental double slashes in URL path (preserve protocol https://)
    if (typeof input === 'string') {
      input = input.replace(/([^:]\/)\/+/g, '$1');
      url = input;
    }

    const isApiCall = url.includes('ngrok') || (API_BASE_URL && url.startsWith(API_BASE_URL)) || url.startsWith('/api/');

    if (isApiCall) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
      
      if (!headers.has('ngrok-skip-browser-warning')) {
        headers.set('ngrok-skip-browser-warning', 'true');
      }

      // Inject Bearer token if not explicitly passed
      const token = getAuthToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Ensure credentials (cookies) are sent
      const credentials = init?.credentials || 'include';

      return originalFetch(input, { ...init, headers, credentials });
    }

    return originalFetch(input, init);
  };
}

