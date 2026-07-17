const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up Multer for local disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.id}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`);
  }
});
const upload = multer({ storage: storage });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const router = express.Router();

// ==========================================
// MIDDLEWARE
// ==========================================
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id from payload
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query('BEGIN');
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    const newUser = userRes.rows[0];

    await pool.query('INSERT INTO profiles (id, name) VALUES ($1, $2)', [newUser.id, email.split('@')[0]]);
    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Account created! Please log in.',
      user: newUser,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(400).json({ error: 'Email already exists or invalid request' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = userRes.rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'Please set a new password to migrate your account.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate Tokens
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' }); // 30 minutes
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' }); // 7 days

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);

    res.json({
      user: { id: user.id, email: user.email },
      token: token,
      refresh_token: refreshToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email, name } = ticket.getPayload();

    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userRes.rows[0];

    if (!user) {
      await pool.query('BEGIN');
      const newUserRes = await pool.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING id, email',
        [email]
      );
      user = newUserRes.rows[0];
      await pool.query(
        'INSERT INTO profiles (id, name) VALUES ($1, $2)',
        [user.id, name]
      );
      await pool.query('COMMIT');
    }

    // Generate Tokens
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
    
    res.json({ 
      token, 
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email } 
    });

  } catch (err) {
    if (err.message && !err.message.includes('Token')) {
       await pool.query('ROLLBACK');
    }
    console.error(err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// Refresh Token Endpoint
router.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    // 1. Verify DB existence (ensures it wasn't revoked/logged out)
    const dbRes = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (dbRes.rows.length === 0) return res.status(403).json({ error: 'Invalid or revoked refresh token' });

    // 2. Verify JWT signature
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // 3. Issue new short-lived access token
    const newAccessToken = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '30m' });
    
    res.json({ token: newAccessToken });
  } catch (err) {
    // If expired, delete it from DB to clean up
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.status(403).json({ error: 'Refresh token expired' });
  }
});

router.post('/api/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    // Revoke the refresh token so it can't be used again
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// PROFILE ROUTES
// ==========================================
router.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.email, p.name FROM users u JOIN profiles p ON u.id = p.id WHERE u.id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    
    res.json({
      id: req.user.id,
      email: result.rows[0].email,
      name: result.rows[0].name || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/profile', auth, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    await pool.query('UPDATE profiles SET name = $1 WHERE id = $2', [name.trim(), req.user.id]);
    
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    res.json({
      id: req.user.id,
      email: result.rows[0].email,
      name: name.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FILE UPLOAD (LOCAL)
// ==========================================
router.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const protocol = req.protocol;
  const host = req.get('host');
  const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});

// ==========================================
// PROJECTS ROUTES
// ==========================================
router.get('/api/projects', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/projects', auth, async (req, res) => {
  const { name, description, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, description, status || 'Active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/projects/:id', auth, async (req, res) => {
  const { name, description, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2, status = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, description, status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TASKS ROUTES
// ==========================================
router.get('/api/projects/:projectId/tasks', auth, async (req, res) => {
  const { search, status, priority, sort, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let queryStr = 'SELECT *, count(*) OVER() as full_count FROM tasks WHERE project_id = $1 AND user_id = $2';
  const values = [req.params.projectId, req.user.id];
  let paramIndex = 3;

  if (search) {
    queryStr += ` AND title ILIKE $${paramIndex}`;
    values.push(`%${search}%`);
    paramIndex++;
  }
  if (status) {
    queryStr += ` AND status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }
  if (priority) {
    queryStr += ` AND priority = $${paramIndex}`;
    values.push(priority);
    paramIndex++;
  }

  if (sort === 'due_date' || !sort) {
    queryStr += ' ORDER BY due_date ASC NULLS LAST, created_at ASC';
  } else if (sort === 'created_desc') {
    queryStr += ' ORDER BY created_at DESC';
  } else {
    queryStr += ' ORDER BY due_date ASC NULLS LAST, created_at ASC';
  }

  queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limitNum, offset);

  try {
    const result = await pool.query(queryStr, values);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count) : 0;
    
    const tasks = result.rows.map(row => {
      const { full_count, ...task } = row;
      return task;
    });

    res.json({
      tasks: tasks,
      total: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/projects/:projectId/tasks', auth, async (req, res) => {
  const { title, description, priority, status, due_date, attachment_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM tasks WHERE user_id = $1', [req.user.id]);
    const taskCount = parseInt(countRes.rows[0].count);

    if (taskCount >= 100) {
      try {
        const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
        await transporter.sendMail({
          from: process.env.MAIL_FROM || '"Task Manager" <noreply@taskmanager.com>',
          to: userRes.rows[0].email,
          subject: 'Task Limit Exceeded',
          text: `You currently have ${taskCount} tasks. You can create up to 100 tasks for free. To create more tasks, please upgrade to a paid plan.`,
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
      return res.status(403).json({ error: `You already have ${taskCount} tasks. You can create up to 100 tasks for free.` });
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, user_id, title, description, priority, status, due_date, attachment_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.projectId, req.user.id, title, description, priority || 'Medium', status || 'Todo', due_date || null, attachment_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/projects/:projectId/tasks/bulk', auth, async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'An array of tasks is required' });
  }

  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM tasks WHERE user_id = $1', [req.user.id]);
    const taskCount = parseInt(countRes.rows[0].count);

    if (taskCount + tasks.length > 100) {
      try {
        const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
        await transporter.sendMail({
          from: process.env.MAIL_FROM || '"Task Manager" <noreply@taskmanager.com>',
          to: userRes.rows[0].email,
          subject: 'Task Limit Exceeded',
          text: `You currently have ${taskCount} tasks. Adding ${tasks.length} more would exceed your free limit of 100 tasks. To create more tasks, please upgrade to a paid plan.`,
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
      return res.status(403).json({ error: `You already have ${taskCount} tasks. Adding ${tasks.length} more exceeds your free limit of 100 tasks.` });
    }

    const values = [];
    const queryPlaceholders = [];
    let paramIndex = 1;

    tasks.forEach(task => {
      queryPlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      values.push(
        req.params.projectId,
        req.user.id,
        task.title,
        task.description || '',
        task.priority || 'Medium',
        task.status || 'Todo',
        task.due_date || null,
        task.attachment_url || null
      );
    });

    const queryStr = `
      INSERT INTO tasks (project_id, user_id, title, description, priority, status, due_date, attachment_url) 
      VALUES ${queryPlaceholders.join(', ')} 
      RETURNING *
    `;

    const result = await pool.query(queryStr, values);
    res.status(201).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/tasks/:id', auth, async (req, res) => {
  const { title, description, priority, status, due_date, attachment_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET title = $1, description = $2, priority = $3, status = $4, due_date = $5, attachment_url = $6 
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, description, priority, status, due_date, attachment_url, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DASHBOARD ROUTE
// ==========================================
router.get('/api/dashboard', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const uid = req.user.id;

  try {
    const [projects, total, completed, pending, overdue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM projects WHERE user_id = $1', [uid]),
      pool.query('SELECT COUNT(*) FROM tasks WHERE user_id = $1', [uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'Completed'", [uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status != 'Completed'", [uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status != 'Completed' AND due_date < $2", [uid, today])
    ]);

    res.json({
      totalProjects: parseInt(projects.rows[0].count) || 0,
      totalTasks: parseInt(total.rows[0].count) || 0,
      completedTasks: parseInt(completed.rows[0].count) || 0,
      pendingTasks: parseInt(pending.rows[0].count) || 0,
      overdueTasks: parseInt(overdue.rows[0].count) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;