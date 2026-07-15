const express = require('express');
const { supabase } = require('./db');

const router = express.Router();

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const token = header.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = data.user;
  req.token = token;
  next();
}


router.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
  });
  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    message: 'Account created! Please check your email to verify your account before logging in.',
    user: { id: data.user.id, email: data.user.email },
  });
});

router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  res.json({
    user: data.user,
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

router.post('/api/auth/logout', auth, async (req, res) => {

  await supabase.auth.admin.signOut(req.token);
  res.json({ message: 'Logged out successfully' });
});

router.get('/api/profile', auth, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || '',
  });
});

router.put('/api/profile', auth, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: { full_name: name.trim() },
  });
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.full_name || '',
  });
});

router.get('/api/projects', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/api/projects', auth, async (req, res) => {
  const { name, description, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: req.user.id, name, description, status: status || 'Active' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/api/projects/:id', auth, async (req, res) => {
  const { name, description, status } = req.body;
  const { data, error } = await supabase
    .from('projects')
    .update({ name, description, status })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Project not found' });
  res.json(data);
});

router.delete('/api/projects/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Project deleted successfully' });
});

router.get('/api/projects/:projectId/tasks', auth, async (req, res) => {
  const { search, status, priority, sort, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const from = (pageNum - 1) * limitNum;

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('project_id', req.params.projectId)
    .eq('user_id', req.user.id);

  if (search)   query = query.ilike('title', `%${search}%`);
  if (status)   query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);

  if (sort === 'due_date' || !sort) {
    query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  } else if (sort === 'created_desc') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  }

  query = query.range(from, from + limitNum - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    tasks: data,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  });
});

router.post('/api/projects/:projectId/tasks', auth, async (req, res) => {
  const { title, description, priority, status, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: req.params.projectId,
      user_id: req.user.id,
      title, description,
      priority: priority || 'Medium',
      status: status || 'Todo',
      due_date: due_date || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.post('/api/projects/:projectId/tasks/bulk', auth, async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'An array of tasks is required' });
  }

  const tasksToInsert = tasks.map(t => ({
    project_id: req.params.projectId,
    user_id: req.user.id,
    title: t.title,
    description: t.description,
    priority: t.priority || 'Medium',
    status: t.status || 'Todo',
    due_date: t.due_date || null,
  }));

  const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/api/tasks/:id', auth, async (req, res) => {
  const { title, description, priority, status, due_date } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, priority, status, due_date })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json(data);
});

router.delete('/api/tasks/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Task deleted successfully' });
});

router.get('/api/dashboard', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const uid = req.user.id;

  const [projects, total, completed, pending, overdue] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'Completed'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).neq('status', 'Completed'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).neq('status', 'Completed').lt('due_date', today),
  ]);

  res.json({
    totalProjects:  projects.count  || 0,
    totalTasks:     total.count     || 0,
    completedTasks: completed.count || 0,
    pendingTasks:   pending.count   || 0,
    overdueTasks:   overdue.count   || 0,
  });
});

module.exports = router;
