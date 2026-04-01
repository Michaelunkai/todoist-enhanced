const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const karma = require('../utils/karma');

const router = express.Router();
router.use(authMiddleware);

// GET /api/karma/:userId
// Returns { points, level, streak } for the given userId.
// Authenticated users can only query their own karma (or admin use case).
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Security: only allow a user to fetch their own karma
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = getDb();
    const summary = await karma.getKarmaSummary(db, userId);
    if (!summary) return res.status(404).json({ error: 'User not found' });

    res.json(summary); // { points, level, streak }
  } catch (err) {
    console.error('GET /karma/:userId error:', err);
    res.status(500).json({ error: 'Failed to fetch karma' });
  }
});

module.exports = router;
