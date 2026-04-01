const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const { run, get } = require('../db/init');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const inboxId = uuidv4();

    await run(
      `INSERT INTO users (id, name, email, password_hash, onboarding_completed) VALUES (?, ?, ?, ?, 0)`,
      [userId, name.trim(), email.toLowerCase(), passwordHash]
    );

    // Create default Inbox project
    await run(
      `INSERT INTO projects (id, user_id, name, color, is_inbox, sort_order) VALUES (?, ?, 'Inbox', '#6366f1', 1, 0)`,
      [inboxId, userId]
    );

    const token = generateToken(userId);
    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), email: email.toLowerCase(), karma: 0, theme: 'light', onboarding_completed: 0 }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get(
      'SELECT id, name, email, password_hash, karma, theme FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last_active
    await run('UPDATE users SET last_active = DATE("now") WHERE id = ?', [user.id]);

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, karma: user.karma, theme: user.theme }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await get(
      'SELECT id, name, email, karma, streak, longest_streak, theme, default_view, start_of_week, onboarding_completed, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// PATCH /api/auth/me - update current user fields (e.g. onboarding_completed)
router.patch('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const { onboarding_completed } = req.body;

    if (onboarding_completed !== undefined) {
      await run('UPDATE users SET onboarding_completed = ? WHERE id = ?', [
        onboarding_completed ? 1 : 0,
        decoded.userId,
      ]);
    }

    const user = await get(
      'SELECT id, name, email, karma, streak, longest_streak, theme, default_view, start_of_week, onboarding_completed, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('PATCH /me error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless - client should delete the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
