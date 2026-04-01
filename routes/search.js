const express = require('express');
const { all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/search?q=<query>
 * Returns tasks, projects, and labels matching the query string.
 * Results are limited to 10 per category.
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ tasks: [], projects: [], labels: [] });
    }

    const term = `%${q.trim()}%`;
    const userId = req.user.id;

    // Search tasks by title or description
    const tasks = await all(
      `SELECT t.id, t.title, t.completed, t.priority, t.due_date,
              p.name AS project_name, p.color AS project_color
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.user_id = ?
         AND (t.title LIKE ? OR t.description LIKE ?)
       ORDER BY t.completed ASC, t.priority DESC, t.created_at DESC
       LIMIT 10`,
      [userId, term, term]
    );

    // Search projects by name
    const projects = await all(
      `SELECT id, name, color
       FROM projects
       WHERE user_id = ? AND name LIKE ?
       ORDER BY name ASC
       LIMIT 10`,
      [userId, term]
    );

    // Search labels by name
    const labels = await all(
      `SELECT id, name, color
       FROM labels
       WHERE user_id = ? AND name LIKE ?
       ORDER BY name ASC
       LIMIT 10`,
      [userId, term]
    );

    res.json({ tasks, projects, labels });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', tasks: [], projects: [], labels: [] });
  }
});

module.exports = router;
