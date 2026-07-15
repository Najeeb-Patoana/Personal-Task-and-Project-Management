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
        setMessage(data.message || 'Account created! Please check your email to verify your account, then sign in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
      } else if (data.token) {
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111115] text-[#f3f3f5] px-4 font-sans antialiased">
      <div className="bg-[#1e1e24] border border-[#2d2d38] p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
        
        {/* Branding Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#7b68ee]">TaskManager</h1>
          <p className="text-[#a0a0b2] text-xs mt-1 font-medium">Personal Project &amp; Task Workspace</p>
        </div>

        <div className="space-y-1.5 border-b border-[#2d2d38] pb-4">
          <h2 className="text-lg font-bold text-white">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-xs text-[#7c7c90]">
            {isRegister ? 'Get started with your free workspace.' : 'Welcome back! Log in to continue.'}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] rounded-xl p-3.5 text-sm font-medium">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-[#192b21] border border-[#2ecc71]/30 text-[#2ecc71] rounded-xl p-3.5 text-sm font-medium">
            {message}
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#a0a0b2] tracking-wider uppercase">Email Address</label>
            <input
              id="email"
              type="email"
              required
              className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#a0a0b2] tracking-wider uppercase">Password</label>
            <input
              id="password"
              type="password"
              required
              className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            id="submit-btn"
            type="submit"
            disabled={loading}
            className="bg-[#7b68ee] hover:bg-[#6855df] text-white w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-60 shadow-lg shadow-[#7b68ee]/15 mt-2"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        {/* Custom Divider line */}
        <div className="flex items-center gap-3 py-1">
          <hr className="flex-1 border-[#2d2d38]" />
          <span className="text-[#7c7c90] text-xs font-semibold uppercase tracking-widest">or</span>
          <hr className="flex-1 border-[#2d2d38]" />
        </div>

        {/* OAuth Buttons */}
        <button
          id="google-btn"
          onClick={handleGoogle}
          className="bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#f3f3f5] w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2.5 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle between Register/Login */}
        <p className="text-center text-xs text-[#a0a0b2] font-medium pt-2">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }}
            className="text-[#7b68ee] ml-1.5 font-bold hover:underline hover:text-[#6855df] transition-colors"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;