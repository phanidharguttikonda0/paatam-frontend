const rawEnvBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
// Automatically normalizes base URL:
// 1. Strips trailing slashes
// 2. Strips trailing '/api' so `${API_BASE_URL}/api/...` never produces duplicate `/api/api`
// 3. Defaults to 'https://api.paatam.in' if no env var is provided
export const API_BASE_URL = (rawEnvBase || 'https://api.paatam.in')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const TOKEN_KEY = 'paatam_jwt_access_token';
const REFRESH_TOKEN_KEY = 'paatam_jwt_refresh_token';

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

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearAuthToken() {
  setAuthToken(null);
  setRefreshToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('paatam_user');
    localStorage.removeItem('paatam_branch_id');
  }
}

export async function checkSystemHealth(): Promise<{ status: string; timestamp?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (res.ok) {
      return await res.json();
    }
    return { status: 'degraded' };
  } catch {
    return { status: 'offline' };
  }
}

// Global fetch enhancer:
// 1. Automatically strips double slashes from URLs (e.g. dev//api -> dev/api)
// 2. Injects 'Authorization: Bearer <token>' if a token is stored
// 3. Enables credentials: 'include' for refresh token cookies
// 4. Automatically refreshes expired JWT via POST /api/auth/refresh on 401
let isRedirectingToLogin = false;

if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Clean up accidental double slashes in URL path (preserve protocol https://)
    if (typeof input === 'string') {
      input = input.replace(/([^:]\/)\/+/g, '$1');
      url = input;
    }

    const isApiCall = (API_BASE_URL && url.startsWith(API_BASE_URL)) || url.startsWith('/api/');

    if (isApiCall) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));

      // Inject Bearer token if not explicitly passed
      const token = getAuthToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Ensure credentials (cookies) are sent
      const credentials = init?.credentials || 'include';

      const response = await originalFetch(input, { ...init, headers, credentials });

      // Automatically handle expired access token (401) using POST /api/auth/refresh
      if (
        response.status === 401 &&
        !url.includes('/api/auth/refresh') &&
        !url.includes('/api/auth/admin/login') &&
        !url.includes('/api/auth/teacher/login') &&
        !url.includes('/api/auth/student/login') &&
        !url.includes('/api/auth/corporate/')
      ) {
        try {
          const refreshBody: any = {};
          const localRefresh = getRefreshToken();
          if (localRefresh) {
            refreshBody.refreshToken = localRefresh;
            refreshBody.refresh_token = localRefresh;
          }

          const refreshRes = await originalFetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(refreshBody)
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.data?.accessToken || data.accessToken || data.token;
            const newRefreshToken = data.data?.refreshToken || data.refreshToken || data.refresh_token;
            if (newToken) {
              setAuthToken(newToken);
              if (newRefreshToken) setRefreshToken(newRefreshToken);
              headers.set('Authorization', `Bearer ${newToken}`);
              // Retry original request with newly refreshed access token
              return originalFetch(input, { ...init, headers, credentials });
            }
          } else {
            // Refresh token has expired or is invalid — clear stale token and redirect cleanly once
            clearAuthToken();
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !isRedirectingToLogin) {
              isRedirectingToLogin = true;
              window.location.replace('/login');
            }
          }
        } catch {
          // Token refresh network failure
        }
      }

      return response;
    }

    return originalFetch(input, init);
  };
}

