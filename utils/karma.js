/**
 * Karma system utility
 * Manages the karma_log table for tracking user points/actions
 */

/**
 * Initialize the karma_log table if it doesn't exist.
 * @param {object} db - SQLite database instance (sqlite3.Database)
 * @returns {Promise<void>}
 */
function init(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS karma_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        task_id     INTEGER,
        points      INTEGER NOT NULL DEFAULT 0,
        action      TEXT NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.run(sql, (err) => {
      if (err) {
        console.error('karma_log table init error:', err.message);
        return reject(err);
      }
      console.log('karma_log table ready.');
      resolve();
    });
  });
}

/**
 * Log a karma event for a user.
 * @param {object} db - SQLite database instance
 * @param {number} userId
 * @param {number|null} taskId
 * @param {number} points
 * @param {string} action
 * @returns {Promise<{lastID: number}>}
 */
function logKarma(db, userId, taskId, points, action) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO karma_log (user_id, task_id, points, action, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, [userId, taskId, points, action], function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID });
    });
  });
}

/**
 * Get total karma points for a user.
 * @param {object} db - SQLite database instance
 * @param {number} userId
 * @returns {Promise<number>}
 */
function getUserKarma(db, userId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT COALESCE(SUM(points), 0) AS total FROM karma_log WHERE user_id = ?`;
    db.get(sql, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.total : 0);
    });
  });
}

/**
 * Get karma log entries for a user (most recent first).
 * @param {object} db - SQLite database instance
 * @param {number} userId
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
function getKarmaLog(db, userId, limit = 50) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, user_id, task_id, points, action, created_at
      FROM karma_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    db.all(sql, [userId, limit], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Get karma level for a user based on total points.
 * Thresholds: Beginner:0, Intermediate:50, Advanced:200, Expert:500, Master:1000
 * @param {object} db - SQLite database instance
 * @param {number} userId
 * @returns {Promise<{level: string, points: number, nextLevel: string|null, pointsToNext: number|null}>}
 */
function getLevel(db, userId) {
  const thresholds = [
    { level: 'Beginner',     min: 0    },
    { level: 'Intermediate', min: 50   },
    { level: 'Advanced',     min: 200  },
    { level: 'Expert',       min: 500  },
    { level: 'Master',       min: 1000 },
  ];

  return new Promise((resolve, reject) => {
    const sql = `SELECT COALESCE(SUM(points), 0) AS total FROM karma_log WHERE user_id = ?`;
    db.get(sql, [userId], (err, row) => {
      if (err) return reject(err);

      const points = row ? row.total : 0;

      // Find current level (last threshold whose min <= points)
      let currentIdx = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (points >= thresholds[i].min) {
          currentIdx = i;
        }
      }

      const current = thresholds[currentIdx];
      const next = thresholds[currentIdx + 1] || null;

      resolve({
        level:        current.level,
        points:       points,
        nextLevel:    next ? next.level : null,
        pointsToNext: next ? next.min - points : null,
      });
    });
  });
}

/**
 * Priority-to-points map for task completion karma awards.
 * Todoist integer priority: 1=p1 (highest/urgent), 4=p4 (lowest/normal).
 * Points: p1=4, p2=3, p3=2, p4=1 (default=1 for unknown priority).
 */
const PRIORITY_POINTS = { 1: 4, 2: 3, 3: 2, 4: 1 };

/**
 * Record a task completion and award karma points based on task priority.
 * Inserts a row into karma_log with action='task_completed' and returns points awarded.
 *
 * @param {object} db     - SQLite database instance (sqlite3.Database)
 * @param {string} userId - ID of the user completing the task
 * @param {object} task   - Task object with fields: id, priority (integer 1-4)
 * @returns {Promise<number>} Points awarded (1-4)
 */
function recordCompletion(db, userId, task) {
  const priority = task && task.priority != null ? Number(task.priority) : 4;
  const points = PRIORITY_POINTS[priority] !== undefined ? PRIORITY_POINTS[priority] : 1;

  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO karma_log (user_id, task_id, points, action, created_at)
      VALUES (?, ?, ?, 'task_completed', CURRENT_TIMESTAMP)
    `;
    db.run(sql, [userId, (task && task.id) || null, points], function (err) {
      if (err) return reject(err);
      resolve(points);
    });
  });
}

/**
 * Get current completion streak for a user (consecutive days ending today with task completions).
 * @param {object} db - SQLite database instance
 * @param {number} userId
 * @returns {Promise<number>} streak count (0 if no completion today)
 */
function getStreak(db, userId) {
  return new Promise((resolve, reject) => {
    // Query distinct dates in last 7 days where action='task_completed'
    const sql = `
      SELECT DISTINCT date(created_at) AS completion_date
      FROM karma_log
      WHERE user_id = ?
        AND action = 'task_completed'
        AND created_at >= date('now', '-6 days')
      ORDER BY completion_date DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      if (!rows || rows.length === 0) return resolve(0);

      // Build a set of date strings for quick lookup
      const dateSet = new Set(rows.map(r => r.completion_date));

      // Get today's date in UTC (YYYY-MM-DD) to match SQLite date()
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // Streak must include today; if today has no completion, streak is 0
      if (!dateSet.has(todayStr)) return resolve(0);

      // Count consecutive days ending today (up to 7)
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        if (dateSet.has(dateStr)) {
          streak++;
        } else {
          break;
        }
      }

      resolve(streak);
    });
  });
}

/**
 * Get karma summary for a user: {points, level, streak}.
 * Uses karma_log SUM for points and getLevel thresholds, plus getStreak for streak count.
 *
 * @param {object} db     - SQLite database instance (sqlite3.Database)
 * @param {string} userId
 * @returns {Promise<{points: number, level: string, streak: number}>}
 */
async function getKarmaSummary(db, userId) {
  const levelData = await getLevel(db, userId);
  const streak = await getStreak(db, userId);
  return {
    points: levelData.points,
    level: levelData.level,
    streak,
  };
}

module.exports = { init, logKarma, getUserKarma, getKarmaLog, getLevel, recordCompletion, getKarmaSummary, PRIORITY_POINTS, getStreak };
