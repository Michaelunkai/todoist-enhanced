-- Todoist Enhanced - Extended Schema Migrations
-- Run these after the base schema.sql has been applied
-- All statements use CREATE TABLE IF NOT EXISTS / ALTER TABLE safely

-- ============================================================
-- TABLE: user_settings (key-value store per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES for user_settings
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key);

-- ============================================================
-- ENSURE sections has all required columns
-- (base schema already has sections but add any missing cols)
-- ============================================================
-- sections: id, project_id, user_id, name, sort_order, is_collapsed, created_at, updated_at
-- Already exists in schema.sql - no changes needed

-- ============================================================
-- ENSURE labels has is_favorite column
-- ============================================================
-- labels: id, user_id, name, color, sort_order, created_at, updated_at
-- Adding is_favorite if missing (ALTER TABLE ignores duplicate column errors in init.js)

-- ============================================================
-- ENSURE filters has is_favorite column
-- ============================================================
-- filters: id, user_id, name, color, query, sort_order, created_at, updated_at
-- Adding is_favorite if missing

-- ============================================================
-- ENSURE comments has attachment_url column
-- ============================================================
-- comments: id, task_id, user_id, content, created_at, updated_at
-- Adding attachment_url for file attachments

-- ============================================================
-- Additional indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_filters_user ON filters(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_log_user ON karma_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_user ON task_templates(user_id);
