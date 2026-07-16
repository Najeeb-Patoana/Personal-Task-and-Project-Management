import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { api } from './api';
import Login from './Login';
import Dashboard from './Dashboard';
import Projects from './Projects';
import Tasks from './Tasks';
import Profile from './Profile';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Called by the Login component after a successful Express login
  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = async () => {
    if (token) {
      try { 
        // Ping our Express backend to handle any server-side logout logic if needed
        await api('/api/auth/logout', { method: 'POST' }, token); 
      } catch (_) {}
    }
    // Clear local auth state
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setToken(null);
  };

  // If there's no token, force the user to the Login screen
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
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

  // Helper to highlight the active menu link
  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return `text-sm font-medium transition-colors duration-150 ${
      isActive 
        ? 'text-[#7b68ee]' 
        : 'text-[#a0a0b2] hover:text-[#f3f3f5]'
    }`;
  };

  return (
    <nav className="bg-[#1e1e24] border-b border-[#2d2d38] px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-8">
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