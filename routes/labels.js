const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Todoist default label colors
const DEFAULT_LABEL_COLORS = [
  '#DB4035', // red
  '#FF9933', // orange
  '#4073FF', // blue
  '#808080', // charcoal
  '#299438', // green
  '#B8256F', // magenta/berry_red
  '#00AAFF'  // light_blue
];

// GET /api/labels/colors — return default color palette
router.get('/colors', (req, res) => {
  res.json({ colors: DEFAULT_LABEL_COLORS });
});

// GET /api/labels
router.get('/', async (req, res) => {
  try {
    const labels = await all(
      `SELECT l.*,
        (SELECT COUNT(*) FROM task_labels tl WHERE tl.label_id = l.id) as task_count
       FROM labels l
       WHERE l.user_id = ?
       ORDER BY l.sort_order ASC, l.name ASC`,
      [req.user.id]
    );
    res.json({ labels });
  } catch (err) {
    console.error('GET /labels error:', err);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// POST /api/labels
router.post('/', async (req, res) => {
  try {
    const { name, color = DEFAULT_LABEL_COLORS[0], order } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Label name is required' });
    }
    if (name.trim().length > 60) {
      return res.status(400).json({ error: 'Label name too long (max 60 chars)' });
    }

    // Check for duplicate label name for this user
    const existing = await get(
      'SELECT id FROM labels WHERE user_id = ? AND name = ?',
      [req.user.id, name.trim()]
    );
    if (existing) {
      return res.status(409).json({ error: 'A label with this name already exists' });
    }

    let sortOrder = order;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = await get(
        'SELECT MAX(sort_order) as max_order FROM labels WHERE user_id = ?',
        [req.user.id]
      );
      sortOrder = (maxRow?.max_order ?? -1) + 1;
    }

    const id = uuidv4();
    await run(
      `INSERT INTO labels (id, user_id, name, color, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, name.trim(), color, sortOrder]
    );

    const label = await get('SELECT * FROM labels WHERE id = ?', [id]);
    res.status(201).json({ label });
  } catch (err) {
    console.error('POST /labels error:', err);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// GET /api/labels/:id
router.get('/:id', async (req, res) => {
  try {
    const label = await get(
      `SELECT l.*,
        (SELECT COUNT(*) FROM task_labels tl WHERE tl.label_id = l.id) as task_count
       FROM labels l
       WHERE l.id = ? AND l.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json({ label });
  } catch (err) {
    console.error('GET /labels/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch label' });
  }
});

// PUT /api/labels/:id
router.put('/:id', async (req, res) => {
  try {
    const label = await get(
      'SELECT * FROM labels WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    const { name, color, order } = req.body;
    const updated = {
      name: name !== undefined ? name.trim() : label.name,
      color: color !== undefined ? color : label.color,
      sort_order: order !== undefined ? order : label.sort_order
    };

    if (updated.name.length === 0) {
      return res.status(400).json({ error: 'Label name cannot be empty' });
    }
    if (updated.name.length > 60) {
      return res.status(400).json({ error: 'Label name too long (max 60 chars)' });
    }

    // Check for duplicate name (excluding current label)
    if (name !== undefined) {
      const duplicate = await get(
        'SELECT id FROM labels WHERE user_id = ? AND name = ? AND id != ?',
        [req.user.id, updated.name, req.params.id]
      );
      if (duplicate) {
        return res.status(409).json({ error: 'A label with this name already exists' });
      }
    }

    await run(
      `UPDATE labels SET name=?, color=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updated.name, updated.color, updated.sort_order, req.params.id, req.user.id]
    );

    const result = await get('SELECT * FROM labels WHERE id = ?', [req.params.id]);
    res.json({ label: result });
  } catch (err) {
    console.error('PUT /labels/:id error:', err);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// DELETE /api/labels/:id
router.delete('/:id', async (req, res) => {
  try {
    const label = await get(
      'SELECT * FROM labels WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await run('DELETE FROM labels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Label deleted' });
  } catch (err) {
    console.error('DELETE /labels/:id error:', err);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

module.exports = router;

// Task-label junction router — mounted at /api/tasks in server.js
const taskLabelRouter = express.Router();
taskLabelRouter.use(authMiddleware);

// POST /api/tasks/:id/labels/:label_id
taskLabelRouter.post('/:taskId/labels/:labelId', async (req, res) => {
  try {
    const { taskId, labelId } = req.params;

    // Verify task belongs to user
    const task = await get(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify label belongs to user
    const label = await get(
      'SELECT id FROM labels WHERE id = ? AND user_id = ?',
      [labelId, req.user.id]
    );
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Check if already assigned
    const existing = await get(
      'SELECT task_id FROM task_labels WHERE task_id = ? AND label_id = ?',
      [taskId, labelId]
    );
    if (existing) {
      return res.status(409).json({ error: 'Label already assigned to this task' });
    }

    await run(
      'INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)',
      [taskId, labelId]
    );

    res.status(201).json({ message: 'Label assigned to task', task_id: taskId, label_id: labelId });
  } catch (err) {
    console.error('POST /tasks/:id/labels/:label_id error:', err);
    res.status(500).json({ error: 'Failed to assign label to task' });
  }
});

// DELETE /api/tasks/:id/labels/:label_id
taskLabelRouter.delete('/:taskId/labels/:labelId', async (req, res) => {
  try {
    const { taskId, labelId } = req.params;

    // Verify task belongs to user
    const task = await get(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await run(
      'DELETE FROM task_labels WHERE task_id = ? AND label_id = ?',
      [taskId, labelId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Label not assigned to this task' });
    }

    res.json({ message: 'Label removed from task', task_id: taskId, label_id: labelId });
  } catch (err) {
    console.error('DELETE /tasks/:id/labels/:label_id error:', err);
    res.status(500).json({ error: 'Failed to remove label from task' });
  }
});

module.exports.taskLabelRouter = taskLabelRouter;
