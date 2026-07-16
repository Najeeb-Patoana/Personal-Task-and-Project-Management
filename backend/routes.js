const express = require('express');
const { supabase } = require('./db');
const nodemailer = require('nodemailer');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const router = express.Router();

// async function auth(req, res, next) {
//   const header = req.headers.authorization;
//   if (!header || !header.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Authorization header missing' });
//   }
//   const token = header.split(' ')[1];
//   const { data, error } = await supabase.auth.getUser(token);
//   if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });
//   req.user = data.user;
//   req.token = token;
//   next();
// }
async function auth(req, res, next) {
  console.time('Auth');

  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    console.timeEnd('Auth');
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = header.split(' ')[1];

  const { data, error } = await supabase.auth.getUser(token);

  console.timeEnd('Auth');

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

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

router.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const file = req.file;
  const fileName = `${req.user.id}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from('task-attachments')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const { data: publicUrlData } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(fileName);

  res.json({ url: publicUrlData.publicUrl });
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

// router.get('/api/projects/:projectId/tasks', auth, async (req, res) => {
//   const { search, status, priority, sort, page = 1, limit = 10 } = req.query;
//   const pageNum = parseInt(page);
//   const limitNum = parseInt(limit);
//   const from = (pageNum - 1) * limitNum;

//   let query = supabase
//     .from('tasks')
//     .select('*', { count: 'exact' })
//     .eq('project_id', req.params.projectId)
//     .eq('user_id', req.user.id);

//   if (search)   query = query.ilike('title', `%${search}%`);
//   if (status)   query = query.eq('status', status);
//   if (priority) query = query.eq('priority', priority);

//   if (sort === 'due_date' || !sort) {
//     query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
//   } else if (sort === 'created_desc') {
//     query = query.order('created_at', { ascending: false });
//   } else {
//     query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
//   }

//   query = query.range(from, from + limitNum - 1);

//   const { data, error, count } = await query;
//   if (error) return res.status(500).json({ error: error.message });

//   res.json({
//     tasks: data,
//     total: count,
//     page: pageNum,
//     limit: limitNum,
//     totalPages: Math.ceil(count / limitNum),
//   });
// });
router.get('/api/projects/:projectId/tasks', auth, async (req, res) => {
  console.time('Total Request');

  const { search, status, priority, sort, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const from = (pageNum - 1) * limitNum;

  console.time('Build Query');

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('project_id', req.params.projectId)
    .eq('user_id', req.user.id);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  if (sort === 'due_date' || !sort) {
    query = query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  } else if (sort === 'created_desc') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  }

  query = query.range(from, from + limitNum - 1);

  console.timeEnd('Build Query');

  console.time('Database Query');

  const { data, error, count } = await query;

  console.timeEnd('Database Query');

  if (error) {
    console.timeEnd('Total Request');
    return res.status(500).json({ error: error.message });
  }

  console.time('Response');

  res.json({
    tasks: data,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  });

  console.timeEnd('Response');
  console.timeEnd('Total Request');
});
router.post('/api/projects/:projectId/tasks', auth, async (req, res) => {
  const { title, description, priority, status, due_date, attachment_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  const { count, error: countError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (countError) return res.status(500).json({ error: countError.message });

  if (count >= 100) {
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || '"Task Manager" <noreply@taskmanager.com>',
        to: req.user.email,
        subject: 'Task Limit Exceeded',
        text: `You currently have ${count} tasks. You can create up to 100 tasks for free. To create more tasks, please upgrade to a paid plan.`,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
    return res.status(403).json({ error: `You already have ${count} tasks. You can create up to 100 tasks for free. To create more, please upgrade to a paid plan.` });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: req.params.projectId,
      user_id: req.user.id,
      title, description,
      priority: priority || 'Medium',
      status: status || 'Todo',
      due_date: due_date || null,
      attachment_url: attachment_url || null,
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

  const { count, error: countError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (countError) return res.status(500).json({ error: countError.message });

  if (count + tasks.length > 100) {
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || '"Task Manager" <noreply@taskmanager.com>',
        to: req.user.email,
        subject: 'Task Limit Exceeded',
        text: `You currently have ${count} tasks. Adding ${tasks.length} more would exceed your free limit of 100 tasks. To create more tasks, please upgrade to a paid plan.`,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
    return res.status(403).json({ error: `You already have ${count} tasks. Adding ${tasks.length} more would exceed your free limit of 100 tasks. To create more, please upgrade to a paid plan.` });
  }

  const tasksToInsert = tasks.map(t => ({
    project_id: req.params.projectId,
    user_id: req.user.id,
    title: t.title,
    description: t.description,
    priority: t.priority || 'Medium',
    status: t.status || 'Todo',
    due_date: t.due_date || null,
    attachment_url: t.attachment_url || null,
  }));

  const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/api/tasks/:id', auth, async (req, res) => {
  const { title, description, priority, status, due_date, attachment_url } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, priority, status, due_date, attachment_url })
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
