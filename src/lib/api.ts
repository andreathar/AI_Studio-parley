const WRITE_TOKEN_KEY = 'agent-parley-write-token';

export function getWriteToken(): string | null {
  try { return sessionStorage.getItem(WRITE_TOKEN_KEY); } catch { return null; }
}
export function setWriteToken(token: string): void {
  try { sessionStorage.setItem(WRITE_TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearWriteToken(): void {
  try { sessionStorage.removeItem(WRITE_TOKEN_KEY); } catch { /* ignore */ }
}
export function hasWriteToken(): boolean { return Boolean(getWriteToken()); }

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init.method || 'GET').toUpperCase();
  const needsAuth = method !== 'GET' || url.includes('/api/diagnostics');
  const headers = new Headers(init.headers || {});
  const token = getWriteToken();
  if (needsAuth && token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && needsAuth) {
    clearWriteToken();
    try { window.dispatchEvent(new CustomEvent('agent-parley:unauthorized')); } catch { /* ignore */ }
  }
  return res;
}
