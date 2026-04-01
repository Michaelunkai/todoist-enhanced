# QA Report: Advanced Feature Flow

**Date:** 2026-03-31
**Scope:** Quick-Add Modal, Labels, Recurring Tasks, Karma/Productivity Score, Focus Mode (summary)
**Tested against:** Node.js+Express+SQLite backend (port 3456), React+Vite+Tailwind frontend

---

## 1. Quick-Add Modal (Ctrl+Q)

**Status: IMPLEMENTED (partial — labels missing)**

### How it works
- Component: `client/src/components/QuickAddModal.jsx`
- Triggered by keyboard shortcut `Ctrl+Q` (registered in `hooks/useKeyboardShortcuts.js`)
- Modal renders with auto-focus on the title field; Escape closes it; clicking the backdrop closes it
- Form fields supported:
  - Task name (required, max 500 chars)
  - Description (textarea)
  - Project (via `ProjectPicker` component — includes section selection)
  - Due date (native `<input type="date">`)
  - Priority (P1/P2/P3/P4 toggle buttons with colour coding)

### What is MISSING from QuickAddModal
| Missing Field | Notes |
|---|---|
| Label assignment | No label picker in the modal; labels must be assigned separately via API |
| Recurring/repeat | No recurrence selector in the modal |
| Due time | `due_time` field exists in API but is absent from the modal UI |

---

## 2. Labels

**Status: IMPLEMENTED (backend full; frontend partial)**

### Backend — FULLY IMPLEMENTED

**Schema** (`db/schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (task_id, label_id)
);
```

**API Endpoints** (`routes/labels.js`):

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/labels` | List all labels for user (with task_count) |
| POST | `/api/labels` | Create label (name, color, order); duplicate name rejected (409) |
| PUT | `/api/labels/:id` | Update label name/color/sort_order |
| DELETE | `/api/labels/:id` | Delete label (cascade removes task_labels rows) |
| POST | `/api/tasks/:taskId/labels/:labelId` | Assign label to task |
| DELETE | `/api/tasks/:taskId/labels/:labelId` | Remove label from task |

All endpoints are auth-protected via `authMiddleware`. Duplicate detection and ownership verification are implemented correctly.

**Task query** (`routes/tasks.js`): The `GET /api/tasks` and `GET /api/tasks/:id` responses do NOT currently join/return label data. Consumers must make a separate call to `/api/labels` and join client-side.

### Frontend — NOT IMPLEMENTED

- No label picker exists in any UI component (`QuickAddModal`, `TaskItem`, `TaskContextMenu`, `TaskEditModal`)
- `TaskItem.jsx` renders priority and due_date badges but has no label badge rendering
- No API calls to `/api/labels` or `/api/tasks/:id/labels/:labelId` are made from the frontend
- Labels are entirely backend-ready but not surfaced in the UI

---

## 3. Recurring Tasks

**Status: PARTIAL — schema exists; no API routes or UI**

### Schema — EXISTS (`db/schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_template_id TEXT,
  pattern TEXT NOT NULL,          -- e.g. 'daily', 'weekly', 'monthly'
  interval_value INTEGER DEFAULT 1,
  weekdays TEXT,                  -- JSON array of weekday numbers (0-6)
  end_date TEXT,
  end_after_count INTEGER,
  occurrences_count INTEGER DEFAULT 0,
  next_due TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `tasks` table also has a `recurring_id TEXT` column that links a task instance back to its recurring rule.

### API Routes — MISSING
- No routes file for recurring tasks exists under `routes/`
- `server.js` does not mount any `/api/recurring` routes
- There is no scheduler/cron logic to auto-generate next occurrences when a task is completed

### Frontend — MISSING
- No recurrence selector in `QuickAddModal`, `TaskEditModal`, or any component
- No UI to create, view, or manage recurring task patterns

### Assessment
Recurring tasks are **stub-level**: the data model is designed and the link column exists on `tasks`, but there is no functional path from the UI to actually create or use them.

---

## 4. Karma / Productivity Score

**Status: IMPLEMENTED (backend full; frontend NOT connected)**

### Backend — FULLY IMPLEMENTED

**Schema** (`db/schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS karma_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  action TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `users` table also has `karma INTEGER`, `streak INTEGER`, and `longest_streak INTEGER` columns (legacy/summary fields).

**Utility** (`utils/karma.js`) — fully implemented functions:

| Function | Description |
|---|---|
| `init(db)` | Creates `karma_log` table if missing |
| `logKarma(db, userId, taskId, points, action)` | Generic karma event logger |
| `recordCompletion(db, userId, task)` | Awards 1–4 points on task completion (priority-based: P1=4, P2=3, P3=2, P4=1) |
| `getUserKarma(db, userId)` | Returns total points (SUM of karma_log) |
| `getKarmaLog(db, userId, limit)` | Returns recent karma events |
| `getLevel(db, userId)` | Returns `{level, points, nextLevel, pointsToNext}` with thresholds: Beginner/50/Intermediate/200/Advanced/500/Expert/1000/Master |
| `getStreak(db, userId)` | Returns consecutive-day streak (0 if no completion today, max 7 days window) |
| `getKarmaSummary(db, userId)` | Returns `{points, level, streak}` — used by the API route |

**API** (`routes/karma.js`):
- `GET /api/karma/:userId` — returns `{points, level, streak}` (user can only fetch their own)

**Critical gap — completion does NOT trigger karma:**
- `routes/tasks.js` `PUT /api/tasks/:id` sets `completed=1` and `completed_at` but does **NOT** call `karma.recordCompletion()` or `karma.logKarma()`
- `karma.init()` is called in `server.js` during startup, and `karma.recordCompletion` exists in the utility, but it is never called by any route
- Karma points are therefore never written on task completion; `karma_log` remains empty for normal use

### Frontend — NOT IMPLEMENTED
- No karma score, level badge, or streak counter is displayed anywhere in the UI
- No calls to `/api/karma/:userId` are made from React components
- `client/src/components/karma.js` file exists but appears to be an empty placeholder (utility only, no React component)

---

## 5. Focus Mode

**Status: PARTIAL — see dedicated report**

Reference: `tests/QA-focus-mode.md`

**Summary:**
- Keyboard shortcut `Ctrl+Shift+F` toggles focus mode ON/OFF
- TopBar and Sidebar are hidden when active; main content narrows to reading column
- `PomodoroTimer.jsx` component is fully built but **not rendered** (dead import in `App.jsx`)
- TopBar receives `isFocusMode`/`onToggleFocusMode` props but does not consume them
- sessionStorage persistence works correctly across page refreshes

---

## Feature Matrix Summary

| Feature | Schema | API | Frontend UI | End-to-End |
|---|---|---|---|---|
| Quick-Add Modal (Ctrl+Q) | N/A | POST /api/tasks | YES (partial) | YES — but no labels/recurrence |
| Labels CRUD | YES | YES (full) | NO | NO |
| Label assignment to tasks | YES (task_labels) | YES | NO | NO |
| Labels shown on task | N/A | partial (no join) | NO | NO |
| Recurring tasks | YES | NO | NO | NO |
| Karma log schema | YES | YES (read-only) | NO | NO |
| Karma on task completion | YES | NOT TRIGGERED | NO | NO |
| Karma score display | N/A | YES | NO | NO |
| Focus mode toggle | N/A | N/A | YES | YES (layout only) |
| Pomodoro in focus mode | N/A | N/A | Component exists, not rendered | NO |

---

## Recommended Fixes (Priority Order)

1. **Karma on completion** — In `routes/tasks.js` `PUT /:id`, after setting `completed=1`, call `karma.recordCompletion(db, req.user.id, task)` and emit updated karma to client
2. **Wire PomodoroTimer** — Render `<PomodoroTimer onExit={toggleFocusMode} />` in `App.jsx` when `isFocusMode === true`
3. **Label picker in QuickAddModal** — Fetch `/api/labels`, render a multi-select badge picker, submit selected label IDs and call `POST /api/tasks/:id/labels/:labelId` after task creation
4. **Labels on TaskItem** — Join labels in `GET /api/tasks` or add a separate fetch; render coloured label chips in `TaskItem.jsx`
5. **Recurring task routes** — Implement `routes/recurring.js` with CRUD and a scheduler (node-cron or similar) to create next task occurrences on completion
6. **Karma display** — Add a karma widget to `TopBar.jsx` or `Sidebar.jsx` polling `/api/karma/:userId`
