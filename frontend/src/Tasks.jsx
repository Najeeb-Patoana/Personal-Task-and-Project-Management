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

function CalendarView({ tasks, currentMonth, setCurrentMonth, onEdit, onDelete }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // padding
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.due_date === dateStr);
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-600 transition-colors">Prev</button>
          <button onClick={nextMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-600 transition-colors">Next</button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden">
        {WEEKDAYS.map(d => (
          <div key={d} className="bg-gray-50 text-center text-sm font-semibold py-3 text-gray-600">{d}</div>
        ))}
        
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="bg-gray-50 min-h-[120px]"></div>;
          
          const dayTasks = getTasksForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div key={`day-${i}`} className={`bg-white min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/20' : ''}`}>
              <div className="flex justify-end">
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>
                  {date.getDate()}
                </div>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] pr-1" style={{ scrollbarWidth: 'none' }}>
                {dayTasks.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => onEdit(t)} 
                    className={`text-[10px] px-1.5 py-1 rounded cursor-pointer truncate shadow-sm transition-transform hover:scale-[1.02] ${t.status === 'Completed' ? 'bg-green-100 text-green-800 line-through opacity-75' : 'bg-blue-100 text-blue-800 border border-blue-200/50'}`} 
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tasks({ token }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // View & Calendar
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Recurring Form
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDuration, setRecurrenceDuration] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState('months');
  const [recurrenceDays, setRecurrenceDays] = useState([]);

  const loadTasks = useCallback(() => {
    const limit = viewMode === 'calendar' ? 500 : 10;
    const params = new URLSearchParams({ page, limit });
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
  }, [projectId, token, page, search, statusFilter, priorityFilter, sort, viewMode]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_TASK);
    setIsRecurring(false);
    setRecurrenceDuration(1);
    setRecurrenceUnit('months');
    setRecurrenceDays([]);
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
      if (editing) {
        const body = { ...form, due_date: form.due_date || null };
        await api(`/api/tasks/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      } else {
        if (isRecurring && form.due_date && recurrenceDays.length > 0) {
          // Generate dates
          const dates = [];
          const [y, m, d] = form.due_date.split('-');
          const currentDate = new Date(y, m - 1, d);
          
          const endDate = new Date(currentDate);
          if (recurrenceUnit === 'days') endDate.setDate(endDate.getDate() + parseInt(recurrenceDuration));
          else if (recurrenceUnit === 'weeks') endDate.setDate(endDate.getDate() + parseInt(recurrenceDuration) * 7);
          else if (recurrenceUnit === 'months') endDate.setMonth(endDate.getMonth() + parseInt(recurrenceDuration));

          const tempDate = new Date(currentDate);
          while (tempDate < endDate) {
            if (recurrenceDays.includes(tempDate.getDay())) {
              const offset = tempDate.getTimezoneOffset();
              const adjusted = new Date(tempDate.getTime() - (offset*60*1000));
              dates.push(adjusted.toISOString().split('T')[0]);
            }
            tempDate.setDate(tempDate.getDate() + 1);
          }

          if (dates.length === 0) {
            throw new Error('No dates generated for the selected recurrence.');
          }

          const tasksArray = dates.map(date => ({
            ...form,
            due_date: date
          }));

          await api(`/api/projects/${projectId}/tasks/bulk`, { method: 'POST', body: JSON.stringify({ tasks: tasksArray }) }, token);
        } else {
          const body = { ...form, due_date: form.due_date || null };
          await api(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }, token);
        }
      }
      setShowForm(false);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
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
      <div className="flex flex-wrap items-center justify-between mt-2 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors">← Back to Projects</button>
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          <h1 className="text-2xl font-bold text-gray-800">Tasks <span className="text-gray-400 text-lg font-normal ml-1">({total})</span></h1>
        </div>
        <div className="flex gap-3">
          <div className="bg-gray-100/80 p-1 rounded-lg flex gap-1 border border-gray-200">
            <button onClick={() => { setViewMode('list'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>List</button>
            <button onClick={() => { setViewMode('calendar'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Calendar</button>
          </div>
          <button
            id="new-task-btn"
            onClick={openCreate}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            + New Task
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

      {/* Filters (List View Only) */}
      {viewMode === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 shadow-sm">
          <input
            id="task-search"
            className="border border-gray-300 rounded-lg p-2.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Search tasks by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            id="status-filter"
            className="border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            id="priority-filter"
            className="border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select
            id="sort-filter"
            className="border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option value="">Sort: Default</option>
            <option value="due_date">Sort: Due Date</option>
          </select>
        </div>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        <CalendarView tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <>
          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl border-dashed">
              <p className="text-gray-500 font-medium">No tasks found in this project.</p>
              <p className="text-gray-400 text-sm mt-1">Create a new task to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`bg-white border rounded-xl p-5 flex items-start justify-between gap-4 transition-all hover:shadow-md ${isOverdue(t) ? 'border-red-300' : 'border-gray-200'}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-gray-800 text-lg mr-2">{t.title}</span>
                      {isOverdue(t) && <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full uppercase tracking-wide">Overdue</span>}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    </div>
                    {t.description && <p className="text-sm text-gray-600 mt-2">{t.description}</p>}
                    {t.due_date && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Due {new Date(t.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(t)} className="text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">Edit</button>
                    <button onClick={() => handleDelete(t.id)} className="text-sm font-medium text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-3 py-1.5 rounded transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-8 justify-center bg-white p-3 rounded-xl border border-gray-200 inline-flex mx-auto shadow-sm">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 hover:text-blue-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600 px-4">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 hover:text-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">{error}</p>}
              
              <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Task Title <span className="text-red-500">*</span></label>
                  <input
                    id="task-title"
                    required
                    className="border border-gray-300 rounded-lg w-full p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="E.g., Go to the gym"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Description</label>
                  <textarea
                    id="task-description"
                    rows={3}
                    className="border border-gray-300 rounded-lg w-full p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    placeholder="Add details, notes, or steps..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Priority</label>
                    <select
                      id="task-priority"
                      className="border border-gray-300 rounded-lg w-full p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Status</label>
                    <select
                      id="task-status"
                      className="border border-gray-300 rounded-lg w-full p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Todo">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {isRecurring ? 'Start Date' : 'Due Date'}
                  </label>
                  <input
                    id="task-due-date"
                    type="date"
                    required={isRecurring}
                    className="border border-gray-300 rounded-lg w-full p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>

                {!editing && (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer mb-2 font-medium">
                      <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)} 
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      Repeat Task
                    </label>
                    
                    {isRecurring && (
                      <div className="space-y-3 mt-3 border-t border-gray-200 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">For</span>
                          <input 
                            type="number" min="1" 
                            value={recurrenceDuration} onChange={(e) => setRecurrenceDuration(e.target.value)} 
                            className="border border-gray-300 rounded p-1.5 w-16 text-sm focus:outline-none focus:border-blue-500" 
                          />
                          <select 
                            value={recurrenceUnit} onChange={(e) => setRecurrenceUnit(e.target.value)} 
                            className="border border-gray-300 rounded p-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600 block mb-1.5">On days:</span>
                          <div className="flex gap-1.5">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                              <button
                                type="button" key={idx}
                                onClick={() => setRecurrenceDays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${recurrenceDays.includes(idx) ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                disabled={loading || (isRecurring && recurrenceDays.length === 0)}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center min-w-[100px]"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : editing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
