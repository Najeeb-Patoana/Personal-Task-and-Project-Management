import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import supabase from './supabase';
import { api } from './api';
import Login from './Login';
import Dashboard from './Dashboard';
import Projects from './Projects';
import Tasks from './Tasks';
import Profile from './Profile';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const ownTokenRef = useRef(localStorage.getItem('token'));

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
        session?.access_token &&
        session.access_token !== ownTokenRef.current
      ) {
        localStorage.setItem('token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        ownTokenRef.current = session.access_token;
        setToken(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        ownTokenRef.current = null;
        setToken(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    ownTokenRef.current = newToken; 
    setToken(newToken);
  };

  const handleLogout = async () => {
    if (token) {
      try { await api('/api/auth/logout', { method: 'POST' }, token); } catch (_) {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    await supabase.auth.signOut();
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={handleLogout} />
      <div className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard token={token} />} />
          <Route path="/projects" element={<Projects token={token} />} />
          <Route path="/projects/:id/tasks" element={<Tasks token={token} />} />
          <Route path="/profile" element={<Profile token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

function Navbar({ onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-blue-600">TaskManager</span>
        <Link to="/" className="text-sm text-gray-600 hover:text-blue-600">Dashboard</Link>
        <Link to="/projects" className="text-sm text-gray-600 hover:text-blue-600">Projects</Link>
        <Link to="/profile" className="text-sm text-gray-600 hover:text-blue-600">Profile</Link>
      </div>
      <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700">
        Logout
      </button>
    </nav>
  );
}

export default App;
