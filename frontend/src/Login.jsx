import { useState } from 'react';
import supabase from './supabase';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isRegister) {
        // Registration: no token yet — user must verify email first
        setMessage(data.message || 'Account created! Please check your email to verify your account, then sign in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
      } else if (data.token) {
        // Login: session token returned
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        onLogin(data.token);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    // window.location.origin is http://localhost:5173 when running via Vite dev server.
    // Make sure this URL is listed in Supabase → Authentication → URL Configuration → Redirect URLs.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">TaskManager</h1>
        <p className="text-gray-500 text-sm mb-6">Personal Project &amp; Task Manager</p>

        <h2 className="text-lg font-semibold mb-4">{isRegister ? 'Create Account' : 'Sign In'}</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 text-sm mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            id="email"
            type="email"
            required
            className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            id="password"
            type="password"
            required
            className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            id="submit-btn"
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full p-2 rounded text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <hr className="flex-1 border-gray-200" />
          <span className="text-gray-400 text-xs">or</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <button
          id="google-btn"
          onClick={handleGoogle}
          className="border border-gray-300 hover:bg-gray-50 w-full p-2 rounded text-sm flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }}
            className="text-blue-600 ml-1 hover:underline"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
