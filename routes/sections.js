const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

// ── Project-scoped router: /api/projects/:id/sections ──────────────────────
const projectSectionsRouter = express.Router({ mergeParams: true });
projectSectionsRouter.use(authMiddleware);

// Helper: verify project belongs to user
async function getProject(projectId, userId) {
  return get(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
}

// Helper: verify section belongs to user
async function getSection(sectionId, userId) {
  return get(
    'SELECT * FROM sections WHERE id = ? AND user_id = ?',
    [sectionId, userId]
  );
}

// GET /api/projects/:id/sections
projectSectionsRouter.get('/', async (req, res) => {
  try {
    const project = await getProject(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const sections = await all(
      `SELECT * FROM sections
       WHERE project_id = ? AND user_id = ?
       ORDER BY sort_order ASC, name ASC`,
      [req.params.id, req.user.id]
    );

    res.json({ sections });
  } catch (err) {
    console.error('GET /projects/:id/sections error:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST /api/projects/:id/sections
projectSectionsRouter.post('/', async (req, res) => {
  try {
    const project = await getProject(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { name, order, isCollapsed = false } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Section name is required' });
    }
    if (name.trim().length > 120) {
      return res.status(400).json({ error: 'Section name too long (max 120 chars)' });
    }

    // Determine sort order
    let sortOrder = order;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = await get(
        'SELECT MAX(sort_order) as max_order FROM sections WHERE project_id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      sortOrder = (maxRow?.max_order ?? -1) + 1;
    }

    const id = uuidv4();
    await run(
      `INSERT INTO sections (id, project_id, user_id, name, sort_order, is_collapsed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, req.user.id, name.trim(), sortOrder, isCollapsed ? 1 : 0]
    );

    const section = await get('SELECT * FROM sections WHERE id = ?', [id]);
    res.status(201).json({ section });
  } catch (err) {
    console.error('POST /projects/:id/sections error:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// ── Standalone section router: /api/sections ───────────────────────────────
const sectionsRouter = express.Router();
sectionsRouter.use(authMiddleware);

// GET /api/sections?project_id=<id>  — list all sections for the user, optionally filtered by project
sectionsRouter.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    let sections;
    if (project_id) {
      sections = await all(
        `SELECT id, name, project_id, sort_order AS "order", is_collapsed, created_at, updated_at
           FROM sections
          WHERE user_id = ? AND project_id = ?
          ORDER BY sort_order ASC, name ASC`,
        [req.user.id, project_id]
      );
    } else {
      sections = await all(
        `SELECT id, name, project_id, sort_order AS "order", is_collapsed, created_at, updated_at
           FROM sections
          WHERE user_id = ?
          ORDER BY project_id ASC, sort_order ASC, name ASC`,
        [req.user.id]
      );
    }
    res.json({ sections });
  } catch (err) {
    console.error('GET /sections error:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST /api/sections — create a section directly (project_id required in body)
sectionsRouter.post('/', async (req, res) => {
  try {
    const { name, project_id, order, isCollapsed = false } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Section name is required' });
    }
    if (name.trim().length > 120) {
      return res.status(400).json({ error: 'Section name too long (max 120 chars)' });
    }
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Verify project belongs to user
    const project = await getProject(project_id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let sortOrder = order;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = await get(
        'SELECT MAX(sort_order) as max_order FROM sections WHERE project_id = ? AND user_id = ?',
        [project_id, req.user.id]
      );
      sortOrder = (maxRow?.max_order ?? -1) + 1;
    }

    const id = uuidv4();
    await run(
      `INSERT INTO sections (id, project_id, user_id, name, sort_order, is_collapsed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, project_id, req.user.id, name.trim(), sortOrder, isCollapsed ? 1 : 0]
    );

    const section = await get(
      `SELECT id, name, project_id, sort_order AS "order", is_collapsed, created_at, updated_at
         FROM sections WHERE id = ?`,
      [id]
    );
    res.status(201).json({ section });
  } catch (err) {
    console.error('POST /sections error:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// GET /api/sections/:id — get a single section
sectionsRouter.get('/:id', async (req, res) => {
  try {
    const section = await get(
      `SELECT id, name, project_id, sort_order AS "order", is_collapsed, created_at, updated_at
         FROM sections WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json({ section });
  } catch (err) {
    console.error('GET /sections/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// PUT /api/sections/:id
sectionsRouter.put('/:id', async (req, res) => {
  try {
    const section = await getSection(req.params.id, req.user.id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const { name, order, isCollapsed } = req.body;

    const updatedName = name !== undefined ? name.trim() : section.name;
    if (updatedName.length === 0) {
      return res.status(400).json({ error: 'Section name cannot be empty' });
    }
    if (updatedName.length > 120) {
      return res.status(400).json({ error: 'Section name too long (max 120 chars)' });
    }

    const updatedOrder = order !== undefined ? order : section.sort_order;
    const updatedCollapsed = isCollapsed !== undefined
      ? (isCollapsed ? 1 : 0)
      : section.is_collapsed;

    await run(
      `UPDATE sections
       SET name=?, sort_order=?, is_collapsed=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updatedName, updatedOrder, updatedCollapsed, req.params.id, req.user.id]
    );

    const result = await get(
      `SELECT id, name, project_id, sort_order AS "order", is_collapsed, created_at, updated_at
         FROM sections WHERE id = ?`,
      [req.params.id]
    );
    res.json({ section: result });
  } catch (err) {
    console.error('PUT /sections/:id error:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE /api/sections/:id
sectionsRouter.delete('/:id', async (req, res) => {
  try {
    const section = await getSection(req.params.id, req.user.id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await run(
      'DELETE FROM sections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error('DELETE /sections/:id error:', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

module.exports = { projectSectionsRouter, sectionsRouter };
