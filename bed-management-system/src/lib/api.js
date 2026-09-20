const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.detail || 'Request failed');
  }

  return data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) =>
    apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) =>
    apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};