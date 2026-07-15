import { useEffect, useState } from 'react';
import { api } from './api';
import { FaUserEdit, FaEnvelope, FaUser } from 'react-icons/fa';

function Profile({ token }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api('/api/profile', {}, token)
      .then((data) => {
        setProfile(data);
        setName(data.name || '');
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name cannot be empty');
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      }, token);
      setProfile(updated);
      setName(updated.name);
      setEditing(false);
      setSuccess('Name updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-6 space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-[#2d2d38] pb-4">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-[#a0a0b2] mt-1">Manage your account credentials and preferences.</p>
      </div>

      {error && (
        <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] p-4 rounded-xl text-sm font-medium transition-all">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-[#192b21] border border-[#2ecc71]/30 text-[#2ecc71] p-4 rounded-xl text-sm font-medium transition-all">
          {success}
        </div>
      )}

      {!profile ? (
        <div className="text-center py-12 text-[#a0a0b2] animate-pulse">
          Loading profile details...
        </div>
      ) : (
        <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-2xl p-8 shadow-xl">
          
          {/* Details / Edit Form Section */}
          <div className="w-full">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#a0a0b2] tracking-wider uppercase mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#7c7c90]">
                      <FaUser size={14} />
                    </span>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full pl-9 pr-3 py-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
                      placeholder="Enter your name"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    id="save-profile-btn"
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#7b68ee] hover:bg-[#6855df] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setName(profile.name || ''); setError(''); }}
                    className="flex-1 bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#f3f3f5] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-[#111115]/50 border border-[#2d2d38] p-4 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-[#7c7c90] uppercase tracking-wider flex items-center gap-1.5">
                      <FaUser className="text-[#a0a0b2]" /> Name
                    </p>
                    <p className="text-sm font-semibold text-[#f3f3f5]">
                      {profile.name || <span className="text-[#7c7c90] italic font-normal">Not set yet</span>}
                    </p>
                  </div>
                  
                  <div className="bg-[#111115]/50 border border-[#2d2d38] p-4 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-[#7c7c90] uppercase tracking-wider flex items-center gap-1.5">
                      <FaEnvelope className="text-[#a0a0b2]" /> Email Address
                    </p>
                    <p className="text-sm font-semibold text-[#f3f3f5] truncate">{profile.email}</p>
                  </div>
                </div>

                <button
                  id="edit-profile-btn"
                  onClick={() => setEditing(true)}
                  className="w-full bg-[#7b68ee]/10 text-[#7b68ee] hover:bg-[#7b68ee]/20 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-[#7b68ee]/20"
                >
                  <FaUserEdit size={16} /> Edit Display Name
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default Profile;