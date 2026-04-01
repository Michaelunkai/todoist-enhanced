const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'todoist.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const MIGRATIONS_PATH = path.join(__dirname, '..', 'migrations.sql');
const SEED_DIR = path.join(__dirname, '..', 'seed-data');

// Todoist color name -> hex mapping
const TODOIST_COLORS = {
  berry_red: '#b8255f', red: '#db4035', orange: '#ff9933', yellow: '#fad000',
  olive_green: '#afb83b', lime_green: '#7ecc49', green: '#299438', mint_green: '#6accbc',
  teal: '#158fad', sky_blue: '#14aaf5', light_blue: '#96c3eb', blue: '#4073ff',
  grape: '#884dff', violet: '#af38eb', lavender: '#eb96eb', magenta: '#e05194',
  salmon: '#ff8d85', charcoal: '#808080', grey: '#b8b8b8', taupe: '#ccac93'
};

function colorToHex(color) {
  if (!color) return '#6366f1';
  if (color.startsWith('#')) return color;
  return TODOIST_COLORS[color] || '#6366f1';
}

let db;

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to open database:', err.message);
        return reject(err);
      }
      console.log('Connected to SQLite database:', DB_PATH);

      // Enable WAL mode for better concurrent performance
      db.run('PRAGMA journal_mode=WAL');
      db.run('PRAGMA foreign_keys=ON');

      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      // Split on semicolons, filter empty statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      db.serialize(() => {
        statements.forEach(stmt => {
          db.run(stmt + ';', (err) => {
            if (err && !err.message.includes('already exists')) {
              console.error('Schema error:', err.message, '\nStatement:', stmt.substring(0, 80));
            }
          });
        });

        console.log('Database schema initialized.');

        // Run migrations for existing databases
        db.run(
          `ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0`,
          (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Migration error (onboarding_completed):', err.message);
            }
          }
        );

        db.run(
          `ALTER TABLE tasks ADD COLUMN pomodoros_done INTEGER DEFAULT 0`,
          (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Migration error (pomodoros_done):', err.message);
            }
          }
        );

        // Migration: ensure all required task columns exist
        const taskColumnMigrations = [
          `ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 4`,
          `ALTER TABLE tasks ADD COLUMN due_date TEXT`,
          `ALTER TABLE tasks ADD COLUMN section_id TEXT`,
          `ALTER TABLE tasks ADD COLUMN recurring TEXT`,
          `ALTER TABLE tasks ADD COLUMN parent_id TEXT`
        ];
        taskColumnMigrations.forEach(stmt => {
          db.run(stmt, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Migration error (task column):', err.message, stmt);
            }
          });
        });

        // Apply extended migrations (user_settings, indexes, new columns)
        const altMigrations = [
          `CREATE TABLE IF NOT EXISTS user_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )`,
          `CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)`,
          `CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key)`,
          `CREATE INDEX IF NOT EXISTS idx_filters_user ON filters(user_id)`,
          `CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_tasks(user_id)`,
          `CREATE INDEX IF NOT EXISTS idx_karma_log_user ON karma_log(user_id)`,
          `ALTER TABLE labels ADD COLUMN is_favorite INTEGER DEFAULT 0`,
          `ALTER TABLE filters ADD COLUMN is_favorite INTEGER DEFAULT 0`,
          `ALTER TABLE comments ADD COLUMN attachment_url TEXT`
        ];

        altMigrations.forEach(stmt => {
          db.run(stmt, (err) => {
            if (err && !err.message.includes('already exists') && !err.message.includes('duplicate column name')) {
              console.error('Migration error:', err.message);
            }
          });
        });

        resolve(db);
      });
    });
  });
}

// ============================================================
// DEMO SEED DATA - inline fallback when seed-data/ is empty
// ============================================================
const DEMO_SEED = {
  userId: 'seed-user-00000000',
  email: 'demo@todoist-enhanced.local',
  projects: [
    { id: 'demo-proj-work',     name: 'Work',     color: '#4073ff', sort_order: 1 },
    { id: 'demo-proj-personal', name: 'Personal', color: '#299438', sort_order: 2 },
    { id: 'demo-proj-shopping', name: 'Shopping', color: '#ff9933', sort_order: 3 }
  ],
  sections: [
    { id: 'demo-sec-work-1',     project_id: 'demo-proj-work',     name: 'In Progress', sort_order: 1 },
    { id: 'demo-sec-work-2',     project_id: 'demo-proj-work',     name: 'Backlog',     sort_order: 2 },
    { id: 'demo-sec-personal-1', project_id: 'demo-proj-personal', name: 'Health',      sort_order: 1 },
    { id: 'demo-sec-personal-2', project_id: 'demo-proj-personal', name: 'Finance',     sort_order: 2 },
    { id: 'demo-sec-shopping-1', project_id: 'demo-proj-shopping', name: 'Groceries',  sort_order: 1 },
    { id: 'demo-sec-shopping-2', project_id: 'demo-proj-shopping', name: 'Electronics',sort_order: 2 }
  ],
  labels: [
    { id: 'demo-lbl-urgent',  name: 'urgent',  color: '#db4035' },
    { id: 'demo-lbl-work',    name: 'work',    color: '#4073ff' },
    { id: 'demo-lbl-home',    name: 'home',    color: '#299438' },
    { id: 'demo-lbl-buy',     name: 'buy',     color: '#ff9933' }
  ],
  // 5 tasks per project = 15 total; variety of priorities, due dates, labels
  tasks: [
    // Work tasks
    { id: 'demo-task-w1', project_id: 'demo-proj-work',     section_id: 'demo-sec-work-1',     title: 'Finish Q2 report',         priority: 1, due_date: '2026-04-05', labels: ['demo-lbl-urgent', 'demo-lbl-work'] },
    { id: 'demo-task-w2', project_id: 'demo-proj-work',     section_id: 'demo-sec-work-1',     title: 'Review pull requests',     priority: 2, due_date: '2026-04-03', labels: ['demo-lbl-work'] },
    { id: 'demo-task-w3', project_id: 'demo-proj-work',     section_id: 'demo-sec-work-2',     title: 'Write unit tests',         priority: 3, due_date: '2026-04-10', labels: ['demo-lbl-work'] },
    { id: 'demo-task-w4', project_id: 'demo-proj-work',     section_id: 'demo-sec-work-2',     title: 'Update documentation',     priority: 4, due_date: null,         labels: [] },
    { id: 'demo-task-w5', project_id: 'demo-proj-work',     section_id: null,                  title: 'Team standup prep',        priority: 2, due_date: '2026-04-02', labels: ['demo-lbl-urgent'] },
    // Personal tasks
    { id: 'demo-task-p1', project_id: 'demo-proj-personal', section_id: 'demo-sec-personal-1', title: 'Morning run 5km',           priority: 3, due_date: '2026-04-02', labels: ['demo-lbl-home'] },
    { id: 'demo-task-p2', project_id: 'demo-proj-personal', section_id: 'demo-sec-personal-1', title: 'Book dentist appointment',  priority: 2, due_date: '2026-04-07', labels: [] },
    { id: 'demo-task-p3', project_id: 'demo-proj-personal', section_id: 'demo-sec-personal-2', title: 'Pay electricity bill',      priority: 1, due_date: '2026-04-04', labels: ['demo-lbl-urgent', 'demo-lbl-home'] },
    { id: 'demo-task-p4', project_id: 'demo-proj-personal', section_id: 'demo-sec-personal-2', title: 'Review monthly budget',     priority: 3, due_date: '2026-04-15', labels: [] },
    { id: 'demo-task-p5', project_id: 'demo-proj-personal', section_id: null,                  title: 'Read 30 minutes',           priority: 4, due_date: null,         labels: ['demo-lbl-home'] },
    // Shopping tasks
    { id: 'demo-task-s1', project_id: 'demo-proj-shopping', section_id: 'demo-sec-shopping-1', title: 'Buy vegetables and fruits',  priority: 2, due_date: '2026-04-02', labels: ['demo-lbl-buy'] },
    { id: 'demo-task-s2', project_id: 'demo-proj-shopping', section_id: 'demo-sec-shopping-1', title: 'Restock coffee and tea',     priority: 3, due_date: '2026-04-03', labels: ['demo-lbl-buy'] },
    { id: 'demo-task-s3', project_id: 'demo-proj-shopping', section_id: 'demo-sec-shopping-2', title: 'Get new headphones',         priority: 4, due_date: null,         labels: ['demo-lbl-buy'] },
    { id: 'demo-task-s4', project_id: 'demo-proj-shopping', section_id: 'demo-sec-shopping-2', title: 'Replace laptop charger',     priority: 1, due_date: '2026-04-06', labels: ['demo-lbl-urgent', 'demo-lbl-buy'] },
    { id: 'demo-task-s5', project_id: 'demo-proj-shopping', section_id: null,                  title: 'Birthday gift for friend',   priority: 2, due_date: '2026-04-12', labels: ['demo-lbl-buy'] }
  ]
};

// ============================================================
// SEED FUNCTION - seeds DB from seed-data/ if DB is empty,
// falling back to inline DEMO_SEED data when no JSON files exist
// ============================================================
async function seedIfEmpty(database) {
  return new Promise((resolve) => {
    // Check if any projects exist
    database.get('SELECT COUNT(*) as cnt FROM projects', (err, row) => {
      if (err || !row || row.cnt > 0) {
        if (!err) console.log('DB already has data (' + row.cnt + ' projects), skipping seed.');
        return resolve();
      }

      console.log('DB is empty - checking for seed data...');

      const projectsFile = path.join(SEED_DIR, 'projects.json');
      const tasksFile = path.join(SEED_DIR, 'tasks.json');
      const sectionsFile = path.join(SEED_DIR, 'sections.json');
      const labelsFile = path.join(SEED_DIR, 'labels.json');

      // Determine whether to use JSON files or inline demo data
      const hasJsonSeed = fs.existsSync(projectsFile);
      let projects, tasks, sections, labels, useDemoInline;

      if (hasJsonSeed) {
        projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        tasks = fs.existsSync(tasksFile) ? JSON.parse(fs.readFileSync(tasksFile, 'utf8')) : [];
        sections = fs.existsSync(sectionsFile) ? JSON.parse(fs.readFileSync(sectionsFile, 'utf8')) : [];
        labels = fs.existsSync(labelsFile) ? JSON.parse(fs.readFileSync(labelsFile, 'utf8')) : [];
        // If JSON seed has no Work/Personal/Shopping projects, augment with demo data
        const hasDemo = projects.some(p => ['Work', 'Personal', 'Shopping'].includes(p.name));
        useDemoInline = !hasDemo;
      } else {
        useDemoInline = true;
      }

      const SEED_USER_ID = DEMO_SEED.userId;
      const SEED_EMAIL = DEMO_SEED.email;

      if (useDemoInline) {
        // ---- Inline demo data seed ----
        console.log('Seeding demo data (Work / Personal / Shopping projects)...');
        database.serialize(() => {
          database.run(
            `INSERT OR IGNORE INTO users (id, name, email, password_hash, theme) VALUES (?, ?, ?, ?, ?)`,
            [SEED_USER_ID, 'Demo User', SEED_EMAIL, 'seed-no-login', 'dark'],
            (err) => { if (err) console.error('Demo seed user error:', err.message); }
          );

          DEMO_SEED.projects.forEach((p) => {
            database.run(
              `INSERT OR IGNORE INTO projects (id, user_id, name, color, is_favorite, is_inbox, sort_order) VALUES (?, ?, ?, ?, 0, 0, ?)`,
              [p.id, SEED_USER_ID, p.name, p.color, p.sort_order],
              (err) => { if (err) console.error('Demo seed project error:', err.message); }
            );
          });

          DEMO_SEED.sections.forEach((s) => {
            database.run(
              `INSERT OR IGNORE INTO sections (id, project_id, user_id, name, sort_order) VALUES (?, ?, ?, ?, ?)`,
              [s.id, s.project_id, SEED_USER_ID, s.name, s.sort_order],
              (err) => { if (err) console.error('Demo seed section error:', err.message); }
            );
          });

          DEMO_SEED.labels.forEach((l, idx) => {
            database.run(
              `INSERT OR IGNORE INTO labels (id, user_id, name, color, is_favorite, sort_order) VALUES (?, ?, ?, ?, 0, ?)`,
              [l.id, SEED_USER_ID, l.name, l.color, idx],
              (err) => { if (err) console.error('Demo seed label error:', err.message); }
            );
          });

          DEMO_SEED.tasks.forEach((t, idx) => {
            database.run(
              `INSERT OR IGNORE INTO tasks (id, user_id, project_id, section_id, title, description, priority, due_date, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
              [t.id, SEED_USER_ID, t.project_id, t.section_id, t.title, '', t.priority, t.due_date, idx],
              (err) => {
                if (err) { console.error('Demo seed task error:', err.message); return; }
                // Link labels
                t.labels.forEach((labelId) => {
                  database.run(
                    `INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`,
                    [t.id, labelId],
                    (err2) => { if (err2) console.error('Demo seed task_label error:', err2.message); }
                  );
                });
              }
            );
          });

          database.run('SELECT 1', () => {
            console.log('Demo seed complete: 3 projects (Work/Personal/Shopping), 6 sections, 4 labels, 15 tasks inserted.');
            resolve();
          });
        });
        return;
      }

      // ---- JSON file seed (original behaviour) ----
      console.log('Seeding from seed-data/ JSON files...');

      database.serialize(() => {
        // Insert seed user
        database.run(
          `INSERT OR IGNORE INTO users (id, name, email, password_hash, theme) VALUES (?, ?, ?, ?, ?)`,
          [SEED_USER_ID, 'Demo User', SEED_EMAIL, 'seed-no-login', 'dark'],
          (err) => { if (err) console.error('Seed user error:', err.message); }
        );

        // Insert projects
        let projCount = 0;
        projects.forEach((p) => {
          const projId = 'seed-proj-' + p.id;
          database.run(
            `INSERT OR IGNORE INTO projects (id, user_id, name, color, is_favorite, is_inbox, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [projId, SEED_USER_ID, p.name, colorToHex(p.color), p.is_favorite ? 1 : 0, p.is_inbox ? 1 : 0, p.child_order || 0],
            (err) => { if (err) console.error('Seed project error:', err.message); else projCount++; }
          );
        });

        // Insert sections
        sections.forEach((s) => {
          const sectionId = 'seed-sec-' + s.id;
          const projId = 'seed-proj-' + s.project_id;
          database.run(
            `INSERT OR IGNORE INTO sections (id, project_id, user_id, name, sort_order) VALUES (?, ?, ?, ?, ?)`,
            [sectionId, projId, SEED_USER_ID, s.name, s.section_order || 0],
            (err) => { if (err) console.error('Seed section error:', err.message); }
          );
        });

        // Insert labels
        const labelIdMap = {};
        labels.forEach((l) => {
          const labelId = 'seed-lbl-' + l.id;
          labelIdMap[l.id] = labelId;
          database.run(
            `INSERT OR IGNORE INTO labels (id, user_id, name, color, is_favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [labelId, SEED_USER_ID, l.name, colorToHex(l.color), l.is_favorite ? 1 : 0, l.order || 0],
            (err) => { if (err) console.error('Seed label error:', err.message); }
          );
        });

        // Insert tasks
        let taskCount = 0;
        tasks.forEach((t) => {
          const taskId = 'seed-task-' + t.id;
          const projId = t.project_id ? 'seed-proj-' + t.project_id : null;
          const sectionId = t.section_id ? 'seed-sec-' + t.section_id : null;
          const dueDate = t.due ? (t.due.date || null) : null;
          const priority = t.priority ? (5 - t.priority) : 4; // Todoist: 4=p1, 1=p4; we invert

          database.run(
            `INSERT OR IGNORE INTO tasks (id, user_id, project_id, section_id, title, description, priority, due_date, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [taskId, SEED_USER_ID, projId, sectionId, t.content, t.description || '', priority, dueDate, t.is_completed ? 1 : 0, t.child_order || 0],
            (err) => { if (err) console.error('Seed task error:', err.message); else taskCount++; }
          );

          // Insert task labels
          if (Array.isArray(t.labels)) {
            t.labels.forEach((labelName) => {
              // Find label by name
              database.get('SELECT id FROM labels WHERE name = ? AND user_id = ?', [labelName, SEED_USER_ID], (err, lrow) => {
                if (lrow) {
                  database.run(
                    `INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`,
                    [taskId, lrow.id],
                    (err2) => { if (err2) console.error('Seed task_label error:', err2.message); }
                  );
                }
              });
            });
          }
        });

        database.run('SELECT 1', () => {
          console.log('Seed complete: ' + projects.length + ' projects, ' + tasks.length + ' tasks, ' + labels.length + ' labels inserted.');
          resolve();
        });
      });
    });
  });
}

// Promise-based query helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = { initDb, seedIfEmpty, getDb, run, get, all };
