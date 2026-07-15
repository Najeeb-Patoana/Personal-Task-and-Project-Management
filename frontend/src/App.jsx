import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
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
    /* Changed bg-gray-50 to ClickUp's dark canvas color: bg-[#111115] */
    <div className="min-h-screen bg-[#111115] text-[#f3f3f5] font-sans antialiased">
      <Navbar onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto p-6">
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
  const location = useLocation();

  // Helper to highlight the active menu link ClickUp-style
  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return `text-sm font-medium transition-colors duration-150 ${
      isActive 
        ? 'text-[#7b68ee]' 
        : 'text-[#a0a0b2] hover:text-[#f3f3f5]'
    }`;
  };

  return (
    /* Changed from bg-white border-gray-200 to dark cool gray and thin slate border */
    <nav className="bg-[#1e1e24] border-b border-[#2d2d38] px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-8">
        {/* ClickUp brand accent color (#7b68ee) used for the logo */}
        <span className="font-extrabold text-lg tracking-tight text-[#7b68ee]">
          TaskManager
        </span>
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass('/')}>Dashboard</Link>
          <Link to="/projects" className={linkClass('/projects')}>Projects</Link>
          <Link to="/profile" className={linkClass('/profile')}>Profile</Link>
        </div>
      </div>
      
      <button 
        onClick={onLogout} 
        className="text-sm font-medium text-[#e74c3c] hover:text-[#ff6b6b] transition-colors duration-150"
      >
        Logout
      </button>
    </nav>
  );
}

export default App;