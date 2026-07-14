import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

const EMPTY = { name: '', description: '', status: 'Active' };

function Projects({ token }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // project being edited
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadProjects = () => {
    api('/api/projects', {}, token)
      .then(setProjects)
      .catch((err) => setError(err.message));
  };

  useEffect(() => { loadProjects(); }, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', status: p.status });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editing) {
        await api(`/api/projects/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) }, token);
      } else {
        await api('/api/projects', { method: 'POST', body: JSON.stringify(form) }, token);
      }
      setShowForm(false);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' }, token);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mt-2 mb-5">
        <h1 className="text-xl font-bold">Projects</h1>
        <button
          id="new-project-btn"
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {/* Project list */}
      {projects.length === 0 ? (
        <p className="text-gray-400 text-sm">No projects yet. Create one!</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </div>
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                <p className="text-xs text-gray-400 mt-1">Created {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/projects/${p.id}/tasks`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Tasks
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Project' : 'New Project'}</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Name *</label>
                <input
                  id="project-name"
                  required
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Description</label>
                <textarea
                  id="project-description"
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Optional description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Status</label>
                <select
                  id="project-status"
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  id="project-submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
