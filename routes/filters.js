const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Valid filter expression tokens for basic validation
// Supports: due:today, due:tomorrow, due:overdue, due:week, due:month,
//           #ProjectName, @label, p1, p2, p3, p4, assigned:me, no date, etc.
function validateQuery(query) {
  if (!query || typeof query !== 'string') return false;
  const trimmed = query.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 500) return false;
  return true;
}

// GET /api/filters
router.get('/', async (req, res) => {
  try {
    const filters = await all(
      `SELECT * FROM filters
       WHERE user_id = ?
       ORDER BY is_favorite DESC, sort_order ASC, name ASC`,
      [req.user.id]
    );
    res.json({ filters });
  } catch (err) {
    console.error('GET /filters error:', err);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// GET /api/filters/:id
router.get('/:id', async (req, res) => {
  try {
    const filter = await get(
      'SELECT * FROM filters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }
    res.json({ filter });
  } catch (err) {
    console.error('GET /filters/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch filter' });
  }
});

// POST /api/filters
router.post('/', async (req, res) => {
  try {
    const { name, query, color = '#6366f1', is_favorite = 0 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Filter name is required' });
    }
    if (name.trim().length > 120) {
      return res.status(400).json({ error: 'Filter name too long (max 120 chars)' });
    }
    if (!validateQuery(query)) {
      return res.status(400).json({ error: 'Filter query is required and must be 1-500 characters' });
    }

    // Check for duplicate filter name for this user
    const existing = await get(
      'SELECT id FROM filters WHERE user_id = ? AND name = ?',
      [req.user.id, name.trim()]
    );
    if (existing) {
      return res.status(409).json({ error: 'A filter with this name already exists' });
    }

    // Auto-assign sort_order
    const maxRow = await get(
      'SELECT MAX(sort_order) as max_order FROM filters WHERE user_id = ?',
      [req.user.id]
    );
    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const id = uuidv4();
    await run(
      `INSERT INTO filters (id, user_id, name, query, color, is_favorite, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name.trim(), query.trim(), color, is_favorite ? 1 : 0, sortOrder]
    );

    const filter = await get('SELECT * FROM filters WHERE id = ?', [id]);
    res.status(201).json({ filter });
  } catch (err) {
    console.error('POST /filters error:', err);
    res.status(500).json({ error: 'Failed to create filter' });
  }
});

// PUT /api/filters/:id
router.put('/:id', async (req, res) => {
  try {
    const filter = await get(
      'SELECT * FROM filters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    const { name, query, color, is_favorite, order } = req.body;

    const updated = {
      name: name !== undefined ? name.trim() : filter.name,
      query: query !== undefined ? query.trim() : filter.query,
      color: color !== undefined ? color : filter.color,
      is_favorite: is_favorite !== undefined ? (is_favorite ? 1 : 0) : filter.is_favorite,
      sort_order: order !== undefined ? order : filter.sort_order
    };

    if (updated.name.length === 0) {
      return res.status(400).json({ error: 'Filter name cannot be empty' });
    }
    if (updated.name.length > 120) {
      return res.status(400).json({ error: 'Filter name too long (max 120 chars)' });
    }
    if (!validateQuery(updated.query)) {
      return res.status(400).json({ error: 'Filter query is required and must be 1-500 characters' });
    }

    // Check for duplicate name (excluding current filter)
    if (name !== undefined) {
      const duplicate = await get(
        'SELECT id FROM filters WHERE user_id = ? AND name = ? AND id != ?',
        [req.user.id, updated.name, req.params.id]
      );
      if (duplicate) {
        return res.status(409).json({ error: 'A filter with this name already exists' });
      }
    }

    await run(
      `UPDATE filters
       SET name=?, query=?, color=?, is_favorite=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updated.name, updated.query, updated.color, updated.is_favorite, updated.sort_order, req.params.id, req.user.id]
    );

    const result = await get('SELECT * FROM filters WHERE id = ?', [req.params.id]);
    res.json({ filter: result });
  } catch (err) {
    console.error('PUT /filters/:id error:', err);
    res.status(500).json({ error: 'Failed to update filter' });
  }
});

// DELETE /api/filters/:id
router.delete('/:id', async (req, res) => {
  try {
    const filter = await get(
      'SELECT * FROM filters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    await run(
      'DELETE FROM filters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Filter deleted' });
  } catch (err) {
    console.error('DELETE /filters/:id error:', err);
    res.status(500).json({ error: 'Failed to delete filter' });
  }
});

module.exports = router;
