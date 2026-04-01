const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper: fetch label ids for a task
async function getTaskLabelIds(taskId) {
  const rows = await all('SELECT label_id FROM task_labels WHERE task_id = ?', [taskId]);
  return rows.map(r => r.label_id);
}

// Helper: sync labels[] array for a task (replace all)
async function syncTaskLabels(taskId, labelIds, userId) {
  if (!Array.isArray(labelIds)) return;
  // Verify all label ids belong to user
  const validLabels = await all(
    `SELECT id FROM labels WHERE user_id = ? AND id IN (${labelIds.map(() => '?').join(',') || 'NULL'})`,
    labelIds.length > 0 ? [userId, ...labelIds] : [userId]
  );
  const validIds = validLabels.map(l => l.id);
  // Delete existing associations
  await run('DELETE FROM task_labels WHERE task_id = ?', [taskId]);
  // Re-insert valid ones
  for (const lid of validIds) {
    await run('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [taskId, lid]);
  }
}

// Helper: attach labels to task objects
async function attachLabels(tasks) {
  if (!tasks || tasks.length === 0) return tasks;
  const ids = tasks.map(t => t.id);
  const rows = await all(
    `SELECT tl.task_id, tl.label_id, l.name, l.color FROM task_labels tl
     JOIN labels l ON l.id = tl.label_id
     WHERE tl.task_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const labelMap = {};
  rows.forEach(r => {
    if (!labelMap[r.task_id]) labelMap[r.task_id] = [];
    labelMap[r.task_id].push({ id: r.label_id, name: r.name, color: r.color });
  });
  return tasks.map(t => ({ ...t, labels: labelMap[t.id] || [] }));
}

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { project_id, completed, priority, due_date, section_id, label_id, parent_id, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT t.*, (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count, (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_completed_count, (SELECT COUNT(*) FROM tasks c WHERE c.parent_id = t.id AND c.user_id = t.user_id) as child_task_count FROM tasks t WHERE t.user_id = ?';
    const params = [req.user.id];
    if (project_id !== undefined) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (section_id !== undefined) { sql += ' AND t.section_id = ?'; params.push(section_id); }
    if (completed !== undefined) { sql += ' AND t.completed = ?'; params.push(completed === 'true' || completed === '1' ? 1 : 0); }
    if (priority !== undefined) { sql += ' AND t.priority = ?'; params.push(parseInt(priority)); }
    if (due_date !== undefined) { sql += ' AND t.due_date = ?'; params.push(due_date); }
    if (label_id !== undefined) {
      sql += ' AND EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id = ?)';
      params.push(label_id);
    }
    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        sql += ' AND t.parent_id IS NULL';
      } else {
        sql += ' AND t.parent_id = ?';
        params.push(parent_id);
      }
    }
    sql += ' ORDER BY t.sort_order ASC, t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    let tasks = await all(sql, params);
    tasks = await attachLabels(tasks);
    res.json({ tasks });
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description = '', project_id, section_id, parent_id, priority = 4, due_date, due_time, sort_order, recurring, labels } = req.body;
    if (!title || title.trim().length === 0) return res.status(400).json({ error: 'Task title is required' });
    if (title.trim().length > 500) return res.status(400).json({ error: 'Task title too long (max 500 chars)' });
    if (project_id) {
      const project = await get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [project_id, req.user.id]);
      if (!project) return res.status(404).json({ error: 'Project not found' });
    }
    if (section_id) {
      const section = await get('SELECT id FROM sections WHERE id = ? AND user_id = ?', [section_id, req.user.id]);
      if (!section) return res.status(404).json({ error: 'Section not found' });
    }
    let taskOrder = sort_order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxRow = await get('SELECT MAX(sort_order) as max_order FROM tasks WHERE user_id = ? AND project_id IS ?', [req.user.id, project_id || null]);
      taskOrder = (maxRow && maxRow.max_order !== null ? maxRow.max_order : -1) + 1;
    }
    const id = uuidv4();
    await run(
      'INSERT INTO tasks (id, user_id, project_id, section_id, parent_id, title, description, priority, due_date, due_time, recurring, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, project_id || null, section_id || null, parent_id || null, title.trim(), description, priority, due_date || null, due_time || null, recurring || null, taskOrder]
    );
    // Sync labels if provided
    if (Array.isArray(labels) && labels.length > 0) {
      await syncTaskLabels(id, labels, req.user.id);
    }
    let task = await get('SELECT * FROM tasks WHERE id = ?', [id]);
    const taskLabels = await getTaskLabelIds(id);
    task = { ...task, labels: taskLabels };
    res.status(201).json({ task });
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    let task = await get(
      'SELECT t.*, (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count, (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_completed_count FROM tasks t WHERE t.id = ? AND t.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const labelRows = await all(
      'SELECT tl.label_id, l.name, l.color FROM task_labels tl JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = ?',
      [req.params.id]
    );
    task = { ...task, labels: labelRows.map(r => ({ id: r.label_id, name: r.name, color: r.color })) };
    res.json({ task });
  } catch (err) {
    console.error('GET /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const task = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const { title, description, project_id, section_id, parent_id, priority, due_date, due_time, completed, sort_order, pomodoros_done, recurring, labels } = req.body;
    if (title !== undefined && title.trim().length === 0) return res.status(400).json({ error: 'Task title cannot be empty' });
    if (title !== undefined && title.trim().length > 500) return res.status(400).json({ error: 'Task title too long (max 500 chars)' });
    // Validate section ownership if changing
    if (section_id !== undefined && section_id) {
      const section = await get('SELECT id FROM sections WHERE id = ? AND user_id = ?', [section_id, req.user.id]);
      if (!section) return res.status(404).json({ error: 'Section not found' });
    }
    const updated = {
      title: title !== undefined ? title.trim() : task.title,
      description: description !== undefined ? description : task.description,
      project_id: project_id !== undefined ? (project_id || null) : task.project_id,
      section_id: section_id !== undefined ? (section_id || null) : task.section_id,
      parent_id: parent_id !== undefined ? (parent_id || null) : task.parent_id,
      priority: priority !== undefined ? parseInt(priority, 10) : task.priority,
      due_date: due_date !== undefined ? (due_date || null) : task.due_date,
      due_time: due_time !== undefined ? (due_time || null) : task.due_time,
      completed: completed !== undefined ? (completed ? 1 : 0) : task.completed,
      completed_at: completed !== undefined ? (completed ? new Date().toISOString() : null) : task.completed_at,
      sort_order: sort_order !== undefined ? sort_order : task.sort_order,
      pomodoros_done: pomodoros_done !== undefined ? Math.max(0, parseInt(pomodoros_done, 10) || 0) : (task.pomodoros_done || 0),
      recurring: recurring !== undefined ? (recurring || null) : task.recurring
    };
    await run(
      'UPDATE tasks SET title=?, description=?, project_id=?, section_id=?, parent_id=?, priority=?, due_date=?, due_time=?, completed=?, completed_at=?, sort_order=?, pomodoros_done=?, recurring=?, updated_at=CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [updated.title, updated.description, updated.project_id, updated.section_id, updated.parent_id, updated.priority, updated.due_date, updated.due_time, updated.completed, updated.completed_at, updated.sort_order, updated.pomodoros_done, updated.recurring, req.params.id, req.user.id]
    );
    // Sync labels if provided as array
    if (Array.isArray(labels)) {
      await syncTaskLabels(req.params.id, labels, req.user.id);
    }
    let result = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const labelRows = await all(
      'SELECT tl.label_id, l.name, l.color FROM task_labels tl JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = ?',
      [req.params.id]
    );
    result = { ...result, labels: labelRows.map(r => ({ id: r.label_id, name: r.name, color: r.color })) };
    res.json({ task: result });
  } catch (err) {
    console.error('PUT /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /api/tasks/reorder  — bulk update sort_order (and optionally project_id)
// body: { tasks: [{ id, sort_order, project_id? }] }
router.post('/reorder', async (req, res) => {
  try {
    const { tasks: items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'tasks array is required' });
    }
    for (const item of items) {
      if (!item.id) continue;
      const task = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [item.id, req.user.id]);
      if (!task) continue;
      const fields = ['sort_order=?'];
      const vals = [item.sort_order];
      if (item.project_id !== undefined) {
        if (item.project_id) {
          const proj = await get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [item.project_id, req.user.id]);
          if (!proj) continue;
        }
        fields.push('project_id=?');
        vals.push(item.project_id || null);
      }
      fields.push('updated_at=CURRENT_TIMESTAMP');
      vals.push(item.id, req.user.id);
      await run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, vals);
    }
    res.json({ message: 'Tasks reordered' });
  } catch (err) {
    console.error('POST /tasks/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await run('DELETE FROM subtasks WHERE task_id = ?', [req.params.id]);
    await run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/subtasks
router.post('/:id/subtasks', async (req, res) => {
  try {
    const parentTask = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!parentTask) return res.status(404).json({ error: 'Task not found' });
    const { title, order_index } = req.body;
    if (!title || title.trim().length === 0) return res.status(400).json({ error: 'Subtask title is required' });
    if (title.trim().length > 500) return res.status(400).json({ error: 'Subtask title too long (max 500 chars)' });
    let sortOrder = order_index;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = await get('SELECT MAX(sort_order) as max_order FROM subtasks WHERE task_id = ?', [req.params.id]);
      sortOrder = (maxRow && maxRow.max_order !== null ? maxRow.max_order : -1) + 1;
    }
    const id = uuidv4();
    await run(
      'INSERT INTO subtasks (id, task_id, user_id, title, completed, sort_order) VALUES (?, ?, ?, ?, 0, ?)',
      [id, req.params.id, req.user.id, title.trim(), sortOrder]
    );
    const subtask = await get('SELECT * FROM subtasks WHERE id = ?', [id]);
    res.status(201).json({ subtask: normalizeSubtask(subtask) });
  } catch (err) {
    console.error('POST /tasks/:id/subtasks error:', err);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
});

// GET /api/tasks/:id/subtasks
router.get('/:id/subtasks', async (req, res) => {
  try {
    const parentTask = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!parentTask) return res.status(404).json({ error: 'Task not found' });
    const subtasks = await all('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC', [req.params.id]);
    res.json({ subtasks: subtasks.map(normalizeSubtask) });
  } catch (err) {
    console.error('GET /tasks/:id/subtasks error:', err);
    res.status(500).json({ error: 'Failed to fetch subtasks' });
  }
});

// Subtask router mounted at /api/subtasks
const subtaskRouter = express.Router();
subtaskRouter.use(authMiddleware);

// PUT /api/subtasks/:id
subtaskRouter.put('/:id', async (req, res) => {
  try {
    const subtask = await get('SELECT s.* FROM subtasks s INNER JOIN tasks t ON s.task_id = t.id WHERE s.id = ? AND t.user_id = ?', [req.params.id, req.user.id]);
    if (!subtask) return res.status(404).json({ error: 'Subtask not found' });
    const { title, completed, order_index } = req.body;
    if (title !== undefined && title.trim().length === 0) return res.status(400).json({ error: 'Subtask title cannot be empty' });
    const updated = {
      title: title !== undefined ? title.trim() : subtask.title,
      completed: completed !== undefined ? (completed ? 1 : 0) : subtask.completed,
      completed_at: completed !== undefined ? (completed ? new Date().toISOString() : null) : subtask.completed_at,
      sort_order: order_index !== undefined ? order_index : subtask.sort_order
    };
    await run(
      'UPDATE subtasks SET title=?, completed=?, completed_at=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id = ?',
      [updated.title, updated.completed, updated.completed_at, updated.sort_order, req.params.id]
    );
    const result = await get('SELECT * FROM subtasks WHERE id = ?', [req.params.id]);
    res.json({ subtask: normalizeSubtask(result) });
  } catch (err) {
    console.error('PUT /subtasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// DELETE /api/subtasks/:id
subtaskRouter.delete('/:id', async (req, res) => {
  try {
    const subtask = await get('SELECT s.id FROM subtasks s INNER JOIN tasks t ON s.task_id = t.id WHERE s.id = ? AND t.user_id = ?', [req.params.id, req.user.id]);
    if (!subtask) return res.status(404).json({ error: 'Subtask not found' });
    await run('DELETE FROM subtasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subtask deleted' });
  } catch (err) {
    console.error('DELETE /subtasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

function normalizeSubtask(s) {
  if (!s) return s;
  return {
    id: s.id,
    parent_task_id: s.task_id,
    title: s.title,
    completed: s.completed,
    order_index: s.sort_order,
    created_at: s.created_at,
    updated_at: s.updated_at
  };
}

module.exports = router;
module.exports.subtaskRouter = subtaskRouter;