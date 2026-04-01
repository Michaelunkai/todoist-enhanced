require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb, seedIfEmpty } = require('./db/init');
const karma = require('./utils/karma');

const app = express();
const PORT = process.env.PORT || 3456;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow React dev
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:3456'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Auth limiter (stricter) — disabled in test environment
if (process.env.NODE_ENV !== 'test') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many auth attempts, please try again later.' }
  });
  app.use('/api/auth', authLimiter);
}

// Routes
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const labelsRoutes = require('./routes/labels');
const { taskLabelRouter } = require('./routes/labels');
const tasksRoutes = require('./routes/tasks');
const { subtaskRouter } = require('./routes/tasks');
const { projectSectionsRouter, sectionsRouter } = require('./routes/sections');
const commentsRoutes = require('./routes/comments');
const karmaRoutes = require('./routes/karma');
const viewsRoutes = require('./routes/views');
const filtersRoutes = require('./routes/filters');
const searchRoutes = require('./routes/search');
const { authMiddleware } = require('./middleware/auth');
const { all: dbAll } = require('./db/init');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/labels', labelsRoutes);
app.use('/api/tasks', taskLabelRouter);
app.use('/api/tasks', tasksRoutes);
app.use('/api/subtasks', subtaskRouter);
app.use('/api/projects/:id/sections', projectSectionsRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/tasks', commentsRoutes);
app.use('/api', commentsRoutes);
app.use('/api/karma', karmaRoutes);
app.use('/api/views', viewsRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/search', searchRoutes);

// Global search: GET /api/search?q=<text>
// Searches tasks (title, description), projects (name), labels (name) for the authenticated user
// Returns: { tasks: [], projects: [], labels: [] }
app.get('/api/search', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ tasks: [], projects: [], labels: [] });
    }
    const like = '%' + q + '%';
    const userId = req.user.id;

    const [tasks, projects, labels] = await Promise.all([
      dbAll(
        'SELECT * FROM tasks WHERE user_id = ? AND (title LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT 50',
        [userId, like, like]
      ),
      dbAll(
        'SELECT * FROM projects WHERE user_id = ? AND name LIKE ? ORDER BY sort_order ASC LIMIT 20',
        [userId, like]
      ),
      dbAll(
        'SELECT * FROM labels WHERE user_id = ? AND name LIKE ? ORDER BY sort_order ASC LIMIT 20',
        [userId, like]
      )
    ]);

    res.json({ tasks, projects, labels });
  } catch (err) {
    console.error('GET /api/search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const now = new Date().toISOString();
  res.status(200).json({
    status: 'ok',
    timestamp: now,
    created_at: now,
    updated_at: now,
    version: '1.0.0'
  });
});

// Serve React build (frontend/dist) as static SPA
app.use(express.static(path.join(__dirname, 'frontend/dist')));
// Catch-all: serve index.html for client-side routing (must be after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// 404 handler for unknown API routes (placed after all route definitions)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware (must have 4 params to be recognized by Express)
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();

  // Log all errors with context
  console.error(`[${timestamp}] ${req.method} ${req.originalUrl} — Error:`, err.stack || err.message);

  // Determine HTTP status code; prefer err.status, then err.statusCode, then 500
  const statusCode = typeof err.status === 'number' ? err.status
    : typeof err.statusCode === 'number' ? err.statusCode
    : 500;

  // Build structured error response
  const body = {
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : (err.message || 'An unexpected error occurred'),
    status: statusCode,
    timestamp
  };

  // Include stack trace in non-production environments for easier debugging
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
});

// Start server
async function start() {
  try {
    const db = await initDb();
    await seedIfEmpty(db);
    await karma.init(db);
    app.listen(PORT, () => {
      console.log(`Todoist Enhanced server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
