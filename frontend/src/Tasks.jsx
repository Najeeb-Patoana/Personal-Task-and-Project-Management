import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from './api';

const EMPTY_TASK = { title: '', description: '', priority: 'Medium', status: 'Todo', due_date: '' };

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  'Todo': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-green-100 text-green-700',
};

function Tasks({ token }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sort, setSort] = useState('');

  // Form
  const [form, setForm] = useState(EMPTY_TASK);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (sort) params.set('sort', sort);

    api(`/api/projects/${projectId}/tasks?${params}`, {}, token)
      .then((data) => {
        if (data) {
          setTasks(data.tasks);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      })
      .catch((err) => setError(err.message));
  }, [projectId, token, page, search, statusFilter, priorityFilter, sort]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_TASK);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      status: t.status,
      due_date: t.due_date || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { ...form, due_date: form.due_date || null };
      if (editing) {
        await api(`/api/tasks/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      } else {
        await api(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }, token);
      }
      setShowForm(false);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE' }, token);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const isOverdue = (task) =>
    task.due_date &&
    task.status !== 'Completed' &&
    new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="text-sm text-gray-500 hover:text-blue-600">← Projects</button>
          <h1 className="text-xl font-bold">Tasks <span className="text-gray-400 text-base font-normal">({total})</span></h1>
        </div>
        <button
          id="new-task-btn"
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap gap-2">
        <input
          id="task-search"
          className="border border-gray-300 rounded p-2 text-sm flex-1 min-w-32 focus:outline-none focus:border-blue-400"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          id="status-filter"
          className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-400"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select
          id="priority-filter"
          className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-400"
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          id="sort-filter"
          className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-400"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          <option value="">Sort: Default</option>
          <option value="due_date">Sort: Due Date</option>
        </select>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`bg-white border rounded-lg p-4 flex items-start justify-between gap-3 ${isOverdue(t) ? 'border-red-300' : 'border-gray-200'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{t.title}</span>
                  {isOverdue(t) && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                {t.due_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    Due: {new Date(t.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="text-sm text-gray-500 hover:text-gray-800">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-sm text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="border border-gray-300 px-3 py-1 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="border border-gray-300 px-3 py-1 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Task' : 'New Task'}</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Title *</label>
                <input
                  id="task-title"
                  required
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Task title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Description</label>
                <textarea
                  id="task-description"
                  rows={2}
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Priority</label>
                  <select
                    id="task-priority"
                    className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Status</label>
                  <select
                    id="task-status"
                    className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Due Date</label>
                <input
                  id="task-due-date"
                  type="date"
                  className="border border-gray-300 rounded w-full p-2 text-sm focus:outline-none focus:border-blue-400"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  id="task-submit"
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

export default Tasks;
