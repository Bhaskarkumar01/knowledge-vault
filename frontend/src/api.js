// const BASE = '/api';
const BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

function getToken() {
  return localStorage.getItem('vault_token');
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),

  // items
  listItems: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return request(`/items${qs ? `?${qs}` : ''}`);
  },
  getItem: (id) => request(`/items/${id}`),
  createItem: (payload) => request('/items', { method: 'POST', body: payload }),
  uploadPdf: (formData) => request('/items/pdf', { method: 'POST', body: formData, isForm: true }),
  updateItem: (id, payload) => request(`/items/${id}`, { method: 'PATCH', body: payload }),
  toggleFavorite: (id) => request(`/items/${id}/favorite`, { method: 'PATCH' }),
  setProgress: (id, progress) => request(`/items/${id}/progress`, { method: 'PATCH', body: { progress } }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // folders
  listFolders: () => request('/folders'),
  createFolder: (payload) => request('/folders', { method: 'POST', body: payload }),
  updateFolder: (id, payload) => request(`/folders/${id}`, { method: 'PATCH', body: payload }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

  // tags
  listTags: () => request('/tags'),
  createTag: (payload) => request('/tags', { method: 'POST', body: payload }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  // review
  todayReview: () => request('/review/today'),
  completeReview: (id) => request(`/review/${id}/complete`, { method: 'POST' }),
};

export function setToken(token) {
  if (token) localStorage.setItem('vault_token', token);
  else localStorage.removeItem('vault_token');
}
export { getToken };
