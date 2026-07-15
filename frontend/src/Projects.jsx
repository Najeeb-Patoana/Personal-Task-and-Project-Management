import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { FaFolderPlus, FaRegEdit, FaTrashAlt, FaFolderOpen } from 'react-icons/fa';

const EMPTY = { name: '', description: '', status: 'Active' };

function Projects({ token }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
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
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' }, token);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2d2d38] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-[#a0a0b2] mt-1">Manage and organize your team workspaces.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#7b68ee] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#6855df] transition-all flex items-center gap-2 shadow-lg shadow-[#7b68ee]/15"
        >
          <FaFolderPlus className="text-base" /> New Project
        </button>
      </div>

      {error && (
        <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-[#1e1e24]/50 border border-[#2d2d38] rounded-xl border-dashed">
          <p className="text-[#a0a0b2] text-sm">No projects found. Create one to start collaborating!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl p-5 flex flex-col justify-between hover:border-[#3e3e4f] hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-lg text-[#f3f3f5] line-clamp-1">{p.name}</span>
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${
                    p.status === 'Active' ? 'bg-[#2ecc71]/10 text-[#2ecc71]' : 'bg-[#a0a0b2]/10 text-[#a0a0b2]'
                  }`}>
                    {p.status}
                  </span>
                </div>
                {p.description && <p className="text-sm text-[#a0a0b2] mt-2 line-clamp-2">{p.description}</p>}
                <p className="text-xs text-[#7c7c90] mt-4">Created {new Date(p.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-2 border-t border-[#2d2d38] mt-5 pt-4">
                <button
                  onClick={() => navigate(`/projects/${p.id}/tasks`)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#7b68ee]/10 text-[#7b68ee] hover:bg-[#7b68ee]/20 py-2 rounded-lg transition-colors"
                >
                  <FaFolderOpen /> View Tasks
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="p-2 text-xs font-medium text-[#a0a0b2] bg-[#2a2a35] hover:text-[#f3f3f5] rounded-lg border border-[#3e3e4f] transition-colors"
                  title="Edit Project"
                >
                  <FaRegEdit size={14} />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 text-xs font-medium text-[#e74c3c] bg-[#e74c3c]/10 hover:bg-[#e74c3c] hover:text-white rounded-lg transition-colors"
                  title="Delete Project"
                >
                  <FaTrashAlt size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Dialog Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-[#f3f3f5]">{editing ? 'Edit Project' : 'New Project'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Project Name *</label>
                <input
                  required
                  className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
                  placeholder="Enter project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Description</label>
                <textarea
                  className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all resize-none"
                  placeholder="Describe your goals"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Status</label>
                <select
                  className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2d2d38]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#f3f3f5] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#7b68ee] hover:bg-[#6855df] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
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