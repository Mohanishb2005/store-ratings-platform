const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export function getToken() { return localStorage.getItem('store-ratings-token'); }
export function setSession(token, user) {
  localStorage.setItem('store-ratings-token', token);
  localStorage.setItem('store-ratings-user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('store-ratings-token');
  localStorage.removeItem('store-ratings-user');
}
export function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('store-ratings-user') || 'null'); } catch { return null; }
}
export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Request failed.');
  return payload;
}
export const json = (body) => JSON.stringify(body);
