const API_URL = import.meta.env.VITE_API_URL || '';

export async function api(endpoint, options = {}, token = null) {
  const headers = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.headers) {
    Object.assign(headers, options.headers);
    delete options.headers;
  }

  let res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });


  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        
        localStorage.setItem('token', newToken);
      
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.reload();
        return null;
      }
    } else {
       
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      window.location.reload();
      return null;
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}