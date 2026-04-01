const express = require('express');
const { all } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const TASK_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count,
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_completed_count
  FROM tasks t
`;

// GET /api/views/today — tasks due today + overdue (incomplete) + completed today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const TASK_SELECT_WITH_PROJECT = `
      SELECT t.*,
        p.name as project_name,
        p.color as project_color,
        (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
    `;

    // Due today (incomplete)
    const todayTasks = await all(
      TASK_SELECT_WITH_PROJECT + `WHERE t.user_id = ? AND t.completed = 0 AND t.due_date = ? ORDER BY t.priority ASC, t.sort_order ASC`,
      [req.user.id, today]
    );

    // Overdue (incomplete, due before today)
    const overdueTasks = await all(
      TASK_SELECT_WITH_PROJECT + `WHERE t.user_id = ? AND t.completed = 0 AND t.due_date < ? AND t.due_date IS NOT NULL ORDER BY t.due_date ASC, t.priority ASC`,
      [req.user.id, today]
    );

    // Completed tasks due today OR completed today
    const completedTasks = await all(
      TASK_SELECT_WITH_PROJECT + `WHERE t.user_id = ? AND t.completed = 1 AND (t.due_date = ? OR (t.completed_at IS NOT NULL AND substr(t.completed_at, 1, 10) = ?)) ORDER BY t.completed_at DESC`,
      [req.user.id, today, today]
    );

    res.json({
      tasks: todayTasks,
      overdue_tasks: overdueTasks,
      completed_tasks: completedTasks,
      view: 'today',
      date: today,
    });
  } catch (err) {
    console.error('GET /views/today error:', err);
    res.status(500).json({ error: 'Failed to fetch today tasks' });
  }
});

// GET /api/views/upcoming — tasks grouped by date bucket (Today/Tomorrow/This Week/Next Week/Later)
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // This week: days 2–6 from today
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + 6);
    const thisWeekEndStr = thisWeekEnd.toISOString().slice(0, 10);

    // Next week: days 7–13
    const nextWeekStart = new Date(now);
    nextWeekStart.setDate(now.getDate() + 7);
    const nextWeekStartStr = nextWeekStart.toISOString().slice(0, 10);

    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(now.getDate() + 13);
    const nextWeekEndStr = nextWeekEnd.toISOString().slice(0, 10);

    // Fetch all incomplete tasks (including those with no due_date for "Later" bucket)
    const tasks = await all(
      TASK_SELECT + `WHERE t.user_id = ? AND t.completed = 0 ORDER BY t.due_date ASC, t.priority ASC, t.sort_order ASC`,
      [req.user.id]
    );

    // Assign a bucket label to each task
    const bucketed = tasks.map(task => {
      let bucket = 'later';
      if (!task.due_date) {
        bucket = 'later';
      } else if (task.due_date <= todayStr) {
        bucket = 'today';
      } else if (task.due_date === tomorrowStr) {
        bucket = 'tomorrow';
      } else if (task.due_date <= thisWeekEndStr) {
        bucket = 'this_week';
      } else if (task.due_date <= nextWeekEndStr) {
        bucket = 'next_week';
      } else {
        bucket = 'later';
      }
      return { ...task, bucket };
    });

    res.json({
      tasks: bucketed,
      view: 'upcoming',
      buckets: {
        today: todayStr,
        tomorrow: tomorrowStr,
        this_week_end: thisWeekEndStr,
        next_week_start: nextWeekStartStr,
        next_week_end: nextWeekEndStr,
      }
    });
  } catch (err) {
    console.error('GET /views/upcoming error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
});

// GET /api/views/inbox — tasks with no project (not completed)
router.get('/inbox', async (req, res) => {
  try {
    const tasks = await all(
      TASK_SELECT + `WHERE t.user_id = ? AND t.completed = 0 AND t.project_id IS NULL ORDER BY t.sort_order ASC, t.created_at DESC`,
      [req.user.id]
    );
    res.json({ tasks, view: 'inbox' });
  } catch (err) {
    console.error('GET /views/inbox error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox tasks' });
  }
});

// GET /api/views/priority — all incomplete tasks sorted by priority (1=highest, 4=lowest)
router.get('/priority', async (req, res) => {
  try {
    const tasks = await all(
      TASK_SELECT + `WHERE t.user_id = ? AND t.completed = 0 ORDER BY t.priority ASC, t.due_date ASC NULLS LAST, t.sort_order ASC`,
      [req.user.id]
    );
    res.json({ tasks, view: 'priority' });
  } catch (err) {
    console.error('GET /views/priority error:', err);
    res.status(500).json({ error: 'Failed to fetch priority tasks' });
  }
});

module.exports = router;
