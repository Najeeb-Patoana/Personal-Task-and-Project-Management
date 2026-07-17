import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Standard Email/Password Login
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
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isRegister) {
        setMessage(data.message || 'Account created! Please sign in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
      } else if (data.token) {
        // Save refresh token if it exists
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

  // Google Login Success Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      setLoading(true);
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google auth failed');
      
      if (data.token) {
        // Save refresh token if it exists
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        onLogin(data.token);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111115] text-[#f3f3f5] px-4 font-sans antialiased">
      <div className="bg-[#1e1e24] border border-[#2d2d38] p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
        
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
            type="submit"
            disabled={loading}
            className="bg-[#7b68ee] hover:bg-[#6855df] text-white w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-60 shadow-lg shadow-[#7b68ee]/15 mt-2"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="flex items-center gap-3 py-1">
          <hr className="flex-1 border-[#2d2d38]" />
          <span className="text-[#7c7c90] text-xs font-semibold uppercase tracking-widest">or</span>
          <hr className="flex-1 border-[#2d2d38]" />
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Login Failed')}
            theme="filled_black"
            width="100%"
          />
        </div>

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