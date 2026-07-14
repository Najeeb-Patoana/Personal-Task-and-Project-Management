const API_URL = import.meta.env.VITE_API_URL || '';

export async function api(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.headers) {
    Object.assign(headers, options.headers);
    delete options.headers;
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // Token expired or invalid — force logout
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
    return null;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
