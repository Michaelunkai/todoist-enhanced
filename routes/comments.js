const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all, getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Ensure comments table exists (CREATE IF NOT EXISTS guard)
router.use((req, res, next) => {
  try {
    const db = getDb();
    db.run(
      `CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Comments table ensure error:', err.message);
        }
      }
    );
  } catch (e) {
    // db not yet ready — proceed anyway
  }
  next();
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const task = await get(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const comments = await all(
      `SELECT c.id, c.task_id, c.content, c.created_at
       FROM comments c
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ comments });
  } catch (err) {
    console.error('GET /tasks/:id/comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await get(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Accept both 'content' and 'text' body fields
    const content = (req.body.content || req.body.text || '').trim();
    if (!content || content.length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment content too long (max 2000 chars)' });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, req.params.id, req.user.id, content]
    );

    const comment = await get(
      'SELECT id, task_id, content, created_at FROM comments WHERE id = ?',
      [id]
    );
    res.status(201).json({ comment });
  } catch (err) {
    console.error('POST /tasks/:id/comments error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/tasks/:id/comments/:commentId  (task-scoped delete)
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const comment = await get(
      'SELECT id FROM comments WHERE id = ? AND task_id = ? AND user_id = ?',
      [req.params.commentId, req.params.id, req.user.id]
    );
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await run(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [req.params.commentId, req.user.id]
    );
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('DELETE /tasks/:id/comments/:commentId error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// PUT /api/comments/:id
router.put('/comments/:id', async (req, res) => {
  try {
    const comment = await get(
      'SELECT * FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    if (text.trim().length > 2000) {
      return res.status(400).json({ error: 'Comment text too long (max 2000 chars)' });
    }

    await run(
      `UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [text.trim(), req.params.id, req.user.id]
    );

    const updated = await get(
      'SELECT id, task_id, content AS text, created_at FROM comments WHERE id = ?',
      [req.params.id]
    );
    res.json({ comment: updated });
  } catch (err) {
    console.error('PUT /comments/:id error:', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await get(
      'SELECT id FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await run(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('DELETE /comments/:id error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
