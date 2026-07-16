import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from './api';
import { FaCalendarAlt, FaListUl, FaPlus, FaArrowLeft, FaRegEdit, FaTrashAlt, FaColumns, FaPaperclip } from 'react-icons/fa';
import CalendarView from './CalendarView';

const EMPTY_TASK = { title: '', description: '', priority: 'Medium', status: 'Todo', due_date: '', attachment_url: '' };

const PRIORITY_COLORS = {
  Low: 'bg-[#a0a0b2]/10 text-[#a0a0b2]',
  Medium: 'bg-[#f1c40f]/10 text-[#f1c40f]',
  High: 'bg-[#e74c3c]/10 text-[#e74c3c]',
};

const STATUS_COLORS = {
  'Todo': 'bg-[#3498db]/10 text-[#3498db]',
  'In Progress': 'bg-[#e67e22]/10 text-[#e67e22]',
  'Completed': 'bg-[#2ecc71]/10 text-[#2ecc71]',
};

function Tasks({ token }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // View modes: 'list', 'board', or 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sort, setSort] = useState('');

  // Form states
  const [form, setForm] = useState(EMPTY_TASK);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Recurring Form
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDuration, setRecurrenceDuration] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState('months');
  const [recurrenceDays, setRecurrenceDays] = useState([]);

  const loadTasks = useCallback(() => {
    // If we are in board or calendar view, pull a high limit so we can show everything across statuses/days
    const limit = viewMode !== 'list' ? 500 : 10;
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

  // OPTIMISTIC UPDATE: Instant delete
  const handleDelete = async (id) => {
   
    // if (!window.confirm("Are you sure you want to delete this task?")) return;

    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));

    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE' }, token);
    } catch (err) {
      setError(`Failed to delete task: ${err.message}`);
      setTasks(previousTasks);
      setTotal(previousTasks.length);
    }
  };

  // KANBAN: Handle when a card is dragged
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  // KANBAN: Handle drop on a status column (Optimistic State Update)
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const taskToUpdate = tasks.find(t => t.id.toString() === taskId);
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;

    const previousTasks = [...tasks];

    // Eagerly update locally
    setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: newStatus } : t));

    try {
      await api(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...taskToUpdate, status: newStatus })
      }, token);
    } catch (err) {
      setError(`Failed to move task: ${err.message}`);
      setTasks(previousTasks); // rollback
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_TASK);
    setIsRecurring(false);
    setRecurrenceDuration(1);
    setRecurrenceUnit('months');
    setRecurrenceDays([]);
    setError('');
    setAttachmentFile(null);
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
      attachment_url: t.attachment_url || '',
    });
    setError('');
    setAttachmentFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let uploadedUrl = form.attachment_url;
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const uploadRes = await api('/api/upload', { method: 'POST', body: formData }, token);
        uploadedUrl = uploadRes.url;
      }

      if (editing) {
        const body = { ...form, due_date: form.due_date || null, attachment_url: uploadedUrl };
        await api(`/api/tasks/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      } else {
        if (isRecurring && form.due_date && recurrenceDays.length > 0) {
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
              const adjusted = new Date(tempDate.getTime() - (offset * 60 * 1000));
              dates.push(adjusted.toISOString().split('T')[0]);
            }
            tempDate.setDate(tempDate.getDate() + 1);
          }

          if (dates.length === 0) {
            throw new Error('No dates generated for the selected recurrence.');
          }

          const tasksArray = dates.map(date => ({
            ...form,
            due_date: date,
            attachment_url: uploadedUrl
          }));

          await api(`/api/projects/${projectId}/tasks/bulk`, { method: 'POST', body: JSON.stringify({ tasks: tasksArray }) }, token);
        } else {
          const body = { ...form, due_date: form.due_date || null, attachment_url: uploadedUrl };
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

  const isOverdue = (task) =>
    task.due_date &&
    task.status !== 'Completed' &&
    new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d2d38] pb-6 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/projects')} 
            className="flex items-center gap-2 text-sm text-[#a0a0b2] hover:text-[#7b68ee] font-semibold transition-colors"
          >
            <FaArrowLeft /> Back
          </button>
          <div className="h-6 w-px bg-[#2d2d38]" />
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Tasks <span className="text-sm font-normal text-[#7c7c90] bg-[#2a2a35] px-2 py-0.5 rounded-full">{total} total</span>
          </h1>
        </div>
        
        <div className="flex gap-3">
          {/* Enhanced Navigation Segment Switcher */}
          <div className="bg-[#1e1e24] p-1 rounded-lg flex gap-1 border border-[#2d2d38]">
            <button 
              onClick={() => { setViewMode('list'); setPage(1); }} 
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'list' ? 'bg-[#2a2a35] text-white' : 'text-[#a0a0b2] hover:text-[#f3f3f5]'
              }`}
            >
              <FaListUl /> List
            </button>
            <button 
              onClick={() => { setViewMode('board'); setPage(1); }} 
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'board' ? 'bg-[#2a2a35] text-white' : 'text-[#a0a0b2] hover:text-[#f3f3f5]'
              }`}
            >
              <FaColumns /> Board
            </button>
            <button 
              onClick={() => { setViewMode('calendar'); setPage(1); }} 
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'calendar' ? 'bg-[#2a2a35] text-white' : 'text-[#a0a0b2] hover:text-[#f3f3f5]'
              }`}
            >
              <FaCalendarAlt /> Calendar
            </button>
          </div>
          
          <button
            onClick={openCreate}
            className="bg-[#7b68ee] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#6855df] transition-all flex items-center gap-2 shadow-lg shadow-[#7b68ee]/15"
          >
            <FaPlus /> New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filters (List View Only) */}
      {viewMode === 'list' && (
        <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl p-4 flex flex-wrap gap-3 shadow-sm">
          <input
            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] flex-1 min-w-[200px] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
            placeholder="Search tasks by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
            value={priorityFilter}
            onChange={(e) => { setPage(1); setPriorityFilter(e.target.value); }}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select
            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option value="">Sort: Default</option>
            <option value="due_date">Sort: Due Date</option>
          </select>
        </div>
      )}

      {/* Main Views Container */}
      {viewMode === 'calendar' ? (
        <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-2xl p-6">
          <CalendarView tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      ) : viewMode === 'board' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {['Todo', 'In Progress', 'Completed'].map((columnStatus) => {
            const columnTasks = tasks.filter((t) => t.status === columnStatus);
            return (
              <div 
                key={columnStatus}
                onDragOver={allowDrop}
                onDrop={(e) => handleDrop(e, columnStatus)}
                className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2d2d38]/60">
                  <span className="font-bold text-sm tracking-wide uppercase text-[#a0a0b2] flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      columnStatus === 'Todo' ? 'bg-[#3498db]' : columnStatus === 'In Progress' ? 'bg-[#e67e22]' : 'bg-[#2ecc71]'
                    }`} />
                    {columnStatus === 'Todo' ? 'To Do' : columnStatus}
                  </span>
                  <span className="text-xs font-semibold text-[#7c7c90] bg-[#2a2a35] px-2 py-0.5 rounded-md">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Body Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      className={`bg-[#111115] border rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-[#3e3e4f] transition-all relative ${
                        isOverdue(t) ? 'border-[#e74c3c]/30' : 'border-[#2d2d38]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-sm text-[#f3f3f5] line-clamp-2">{t.title}</h3>
                        </div>
                        
                        {t.description && <p className="text-xs text-[#a0a0b2] line-clamp-2">{t.description}</p>}

                        <div className="flex items-center justify-between pt-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>
                            {t.priority}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {t.attachment_url && (
                              <a href={t.attachment_url} target="_blank" rel="noreferrer" className="text-[#7b68ee] hover:text-[#f3f3f5] transition-colors" title="View Attachment">
                                <FaPaperclip size={12} />
                              </a>
                            )}
                            {t.due_date && (
                              <span className="text-[10px] text-[#7c7c90] flex items-center gap-1 font-semibold">
                                <FaCalendarAlt size={10} />
                                {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons overlay */}
                      <div className="flex gap-1.5 justify-end border-t border-[#2d2d38] mt-3 pt-2.5">
                        <button onClick={() => openEdit(t)} className="text-[10px] font-bold text-[#a0a0b2] hover:text-[#7b68ee]">Edit</button>
                        <span className="text-[#2d2d38] text-xs">|</span>
                        <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-[#e74c3c] hover:text-[#ff6b6b]">Delete</button>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-10 border border-[#2d2d38]/50 border-dashed rounded-xl">
                      <p className="text-xs text-[#7c7c90]">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD LIST VIEW */
        <>
          {tasks.length === 0 ? (
            <div className="text-center py-16 bg-[#1e1e24]/30 border border-[#2d2d38] rounded-xl border-dashed">
              <p className="text-[#a0a0b2] text-sm">No tasks found in this workspace.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`bg-[#1e1e24] border rounded-xl p-5 flex items-start justify-between gap-4 transition-all hover:border-[#3e3e4f] ${
                    isOverdue(t) ? 'border-[#e74c3c]/50' : 'border-[#2d2d38]'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-bold text-lg text-white mr-2">{t.title}</span>
                      {isOverdue(t) && (
                        <span className="text-[10px] font-bold bg-[#e74c3c]/15 text-[#e74c3c] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                      <span className={`text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority}
                      </span>
                      <span className={`text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    {t.description && <p className="text-sm text-[#a0a0b2] mt-2 line-clamp-2">{t.description}</p>}
                    
                    <div className="flex items-center gap-4 mt-3.5">
                      {t.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-[#7c7c90] font-medium">
                          <FaCalendarAlt size={12} className="text-[#a0a0b2]" />
                          Due {new Date(t.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {t.attachment_url && (
                        <a href={t.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-[#7b68ee] hover:text-[#6855df] font-medium transition-colors">
                          <FaPaperclip size={12} /> View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => openEdit(t)} 
                      className="p-2 text-xs font-semibold text-[#a0a0b2] bg-[#2a2a35] border border-[#3e3e4f] hover:text-[#f3f3f5] rounded-lg transition-all"
                    >
                      <FaRegEdit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="p-2 text-xs font-semibold text-[#e74c3c] bg-[#e74c3c]/10 hover:bg-[#e74c3c] hover:text-white rounded-lg transition-all"
                    >
                      <FaTrashAlt size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="bg-[#1e1e24] border border-[#2d2d38] text-[#a0a0b2] hover:text-white disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-[#a0a0b2]">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="bg-[#1e1e24] border border-[#2d2d38] text-[#a0a0b2] hover:text-white disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Form Overlay Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#2d2d38] flex justify-between items-center bg-[#1c1c22]">
              <h2 className="text-xl font-bold text-[#f3f3f5]">{editing ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-[#a0a0b2] hover:text-[#f3f3f5] p-1 rounded-full transition-colors">
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] p-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Task Title *</label>
                  <input
                    required
                    className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all"
                    placeholder="E.g., Design interface concepts"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] placeholder-[#7c7c90] focus:outline-none focus:border-[#7b68ee] focus:ring-1 focus:ring-[#7b68ee] transition-all resize-none"
                    placeholder="Add details, notes, or steps..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Priority</label>
                    <select
                      className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Status</label>
                    <select
                      className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Todo">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                
                <div className="border-t border-[#2d2d38] pt-4">
                  <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">
                    {isRecurring ? 'Start Date' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    required={isRecurring}
                    className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg w-full p-2.5 text-sm text-[#f3f3f5] focus:outline-none focus:border-[#7b68ee]"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>

                <div className="border-t border-[#2d2d38] pt-4">
                  <label className="text-xs font-bold text-[#a0a0b2] tracking-wider uppercase block mb-1.5">Attachment (Optional)</label>
                  <input
                    type="file"
                    className="block w-full text-sm text-[#7c7c90] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#7b68ee]/10 file:text-[#7b68ee] hover:file:bg-[#7b68ee]/20 transition-all cursor-pointer"
                    onChange={(e) => setAttachmentFile(e.target.files[0])}
                  />
                  {form.attachment_url && !attachmentFile && (
                    <div className="mt-2 text-xs text-[#a0a0b2]">
                      Current: <a href={form.attachment_url} target="_blank" rel="noreferrer" className="text-[#7b68ee] hover:underline">View File</a>
                    </div>
                  )}
                  {attachmentFile && (
                    <div className="mt-2 text-xs text-[#2ecc71]">Selected: {attachmentFile.name}</div>
                  )}
                </div>

                {!editing && (
                  <div className="bg-[#1c1c22] border border-[#2d2d38] p-4 rounded-xl space-y-3">
                    <label className="flex items-center gap-2.5 text-sm font-semibold text-[#f3f3f5] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)} 
                        className="w-4 h-4 accent-[#7b68ee] rounded border-[#3e3e4f]"
                      />
                      Repeat Task (Recurring)
                    </label>
                    
                    {isRecurring && (
                      <div className="space-y-4 pt-3 border-t border-[#2d2d38]">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#a0a0b2]">For</span>
                          <input 
                            type="number" min="1" 
                            value={recurrenceDuration} onChange={(e) => setRecurrenceDuration(e.target.value)} 
                            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2 w-16 text-sm text-center text-white" 
                          />
                          <select 
                            value={recurrenceUnit} onChange={(e) => setRecurrenceUnit(e.target.value)} 
                            className="bg-[#2a2a35] border border-[#3e3e4f] rounded-lg p-2 text-sm text-white"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                        
                        <div>
                          <span className="text-xs font-bold text-[#a0a0b2] uppercase tracking-wider block mb-2">On days:</span>
                          <div className="flex gap-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                              <button
                                type="button" key={idx}
                                onClick={() => setRecurrenceDays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${
                                  recurrenceDays.includes(idx) 
                                    ? 'bg-[#7b68ee] text-white border-[#7b68ee]' 
                                    : 'bg-[#2a2a35] border-[#3e3e4f] text-[#a0a0b2] hover:bg-[#323241]'
                                }`}
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
            
            <div className="px-6 py-4 border-t border-[#2d2d38] bg-[#1c1c22] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#f3f3f5] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                disabled={loading || (isRecurring && recurrenceDays.length === 0)}
                className="bg-[#7b68ee] hover:bg-[#6855df] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]"
              >
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;