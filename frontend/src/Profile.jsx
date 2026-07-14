import { useEffect, useState } from 'react';
import { api } from './api';

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
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-xl font-bold mb-6">My Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">
          {success}
        </div>
      )}

      {!profile ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        
          {/* Edit form */}
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  id="save-profile-btn"
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setName(profile.name || ''); setError(''); }}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm text-gray-800">
                  {profile.name || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-gray-800">{profile.email}</p>
              </div>
              <button
                id="edit-profile-btn"
                onClick={() => setEditing(true)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Name
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
