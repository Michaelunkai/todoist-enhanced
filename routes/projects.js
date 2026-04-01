const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await all(
      `SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.completed = 0) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.completed = 1) as completed_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_count
       FROM projects p
       WHERE p.user_id = ?
       ORDER BY p.is_inbox DESC, p.sort_order ASC, p.name ASC`,
      [req.user.id]
    );
    res.json({ projects });
  } catch (err) {
    console.error('GET /projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { name, color = '#6366f1', icon = '', isFavorite = false, viewType = 'list', order } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (name.trim().length > 120) {
      return res.status(400).json({ error: 'Project name too long (max 120 chars)' });
    }

    // Determine sort order
    let sortOrder = order;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = await get(
        'SELECT MAX(sort_order) as max_order FROM projects WHERE user_id = ?',
        [req.user.id]
      );
      sortOrder = (maxRow?.max_order ?? -1) + 1;
    }

    const id = uuidv4();
    await run(
      `INSERT INTO projects (id, user_id, name, color, icon, is_favorite, view_type, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name.trim(), color, icon, isFavorite ? 1 : 0, viewType, sortOrder]
    );

    const project = await get('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json({ project });
  } catch (err) {
    console.error('POST /projects error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await get(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (err) {
    console.error('GET /projects/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const project = await get(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.is_inbox) {
      return res.status(403).json({ error: 'Cannot modify the Inbox project' });
    }

    const { name, color, icon, isFavorite, viewType, order } = req.body;
    const updated = {
      name: name !== undefined ? name.trim() : project.name,
      color: color !== undefined ? color : project.color,
      icon: icon !== undefined ? icon : project.icon,
      is_favorite: isFavorite !== undefined ? (isFavorite ? 1 : 0) : project.is_favorite,
      view_type: viewType !== undefined ? viewType : project.view_type,
      sort_order: order !== undefined ? order : project.sort_order
    };

    if (updated.name.length === 0) {
      return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    await run(
      `UPDATE projects SET name=?, color=?, icon=?, is_favorite=?, view_type=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updated.name, updated.color, updated.icon, updated.is_favorite, updated.view_type, updated.sort_order, req.params.id, req.user.id]
    );

    const result = await get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json({ project: result });
  } catch (err) {
    console.error('PUT /projects/:id error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// POST /api/projects/reorder  — bulk update sort_order
// body: { projects: [{ id, sort_order }] }
router.post('/reorder', async (req, res) => {
  try {
    const { projects: items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'projects array is required' });
    }
    for (const item of items) {
      if (!item.id) continue;
      const project = await get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [item.id, req.user.id]);
      if (!project) continue;
      await run(
        'UPDATE projects SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [item.sort_order, item.id, req.user.id]
      );
    }
    res.json({ message: 'Projects reordered' });
  } catch (err) {
    console.error('POST /projects/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const project = await get(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.is_inbox) {
      return res.status(403).json({ error: 'Cannot delete the Inbox project' });
    }

    await run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
