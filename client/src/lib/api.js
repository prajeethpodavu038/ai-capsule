// client/src/lib/api.js
//
// Small fetch wrapper. `credentials: 'include'` ensures the HttpOnly
// `token` cookie set by the Express backend is sent with every request -
// the frontend never reads or stores the JWT itself (it can't; it's
// HttpOnly), it just relies on the browser attaching the cookie.

const BASE = ''; // same-origin: Express serves both the API and the built SPA

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  me: () => request('/api/me'),
  listCapsules: () => request('/api/capsules'),
  createCapsule: (payload) =>
    request('/api/capsules', { method: 'POST', body: JSON.stringify(payload) }),
  updateCapsule: (id, payload) =>
    request(`/api/capsules/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCapsule: (id) => request(`/api/capsules/${id}`, { method: 'DELETE' }),
};
