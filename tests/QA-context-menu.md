# QA Report: Right-Click Context Menu on Tasks

**Date:** 2026-03-31
**Scope:** Manual / code-review QA of the task right-click context menu
**Files reviewed:**
- `client/src/components/TaskContextMenu.jsx`
- `client/src/components/TaskItem.jsx`
- `client/src/components/TaskList.jsx`
- `client/src/components/ProjectPicker.jsx`

---

## 1. Implementation Overview

The right-click context menu is implemented as two cooperating components:

### TaskItem.jsx (trigger layer)
- Attaches `onContextMenu` handler to the task row `<div>`.
- Calls `e.preventDefault()` to suppress the browser's native context menu.
- Stores mouse coordinates `{ x: e.clientX, y: e.clientY }` in local state.
- When state is non-null, renders `<TaskContextMenu>` as a sibling via a React fragment.
- Also exposes a three-dot ellipsis button (visible on hover) that opens the same menu
  via a regular `onClick` — providing a keyboard/pointer-accessible alternative.

### TaskContextMenu.jsx (menu layer)
- Positioned with `position: fixed` at the stored mouse coordinates.
- On mount, reads its own bounding rect and clamps position to stay within viewport
  (8 px margin on all sides).
- Two auto-close mechanisms:
  - `mousedown` outside the menu element → calls `onClose()`
  - `Escape` keydown → calls `onClose()`

### TaskList.jsx (orchestration layer)
- Owns `editingTask` state and renders `<TaskEditModal>` conditionally.
- Wires all four context-menu callbacks: `onEdit`, `onDuplicated`, `onMoved`, `onDeleted`.
- Each callback calls `onRefresh()` (re-fetch from server) after the action, ensuring
  the UI stays in sync.

---

## 2. Menu Items

| Item | Icon | Keyboard role | Backend call | Outcome |
|------|------|---------------|--------------|---------|
| **Edit** | Pencil SVG | `role="menuitem"` | None (opens modal) | Opens `TaskEditModal` with current task data |
| **Duplicate** | Copy SVG | `role="menuitem"` | `POST /api/tasks` | Creates new task with title " (copy)", same project/section/priority/due_date |
| **Move to project** | Folder SVG | `role="menuitem"` + `aria-haspopup` | `PUT /api/tasks/:id` | Expands inline `ProjectPicker`; updates `project_id` + `section_id` |
| **Delete** | Trash SVG | `role="menuitem"` | `DELETE /api/tasks/:id` | Prompts `window.confirm`, then hard-deletes task |

A horizontal separator (`<div role="" class="border-t">`) visually separates
the destructive Delete action from the non-destructive items above.

---

## 3. Expected Behavior for Each Option

### 3.1 Edit
- Clicking "Edit" calls `onClose()` then `onEdit(task)`.
- `TaskList` sets `editingTask = task`, which renders `<TaskEditModal>`.
- On save: modal closes, `onRefresh()` fires, task list re-fetches.
- On cancel: modal closes, no data change.

### 3.2 Duplicate
- Clicking "Duplicate" calls `onClose()` immediately (menu closes before async work).
- Sends `POST /api/tasks` with the task's `title + ' (copy)'`, copying `description`,
  `project_id`, `section_id`, `priority`, `due_date`, `due_time`.
- On `res.ok`: calls `onDuplicate(newTask)` — `TaskList` calls `onRefresh()`.
- On network error: logs to console, no user-visible feedback.

### 3.3 Move to Project
- Clicking "Move to project" toggles an inline `<ProjectPicker>` within the menu.
- `ProjectPicker` fetches all projects and their sections from `GET /api/projects`
  and `GET /api/projects/:id/sections` on open.
- Selecting a project or section calls `handleMoveToProject({ projectId, sectionId })`.
- Sends `PUT /api/tasks/:id` with `{ project_id, section_id }`.
- On `res.ok`: calls `onMoved(updatedTask)` — `TaskList` calls `onRefresh()`.
- Selecting "No project (Inbox)" sets both fields to `null`.

### 3.4 Delete
- Clicking "Delete" shows `window.confirm('Delete task "<title>"?')`.
- If confirmed: calls `onClose()`, then `DELETE /api/tasks/:id`.
- On `res.ok`: calls `onDelete(task.id)` — `TaskList` calls `onRefresh()`.
- If user cancels confirm dialog: function returns early, menu stays open (confirmed
  via code: `onClose()` is only called after the confirm guard).

---

## 4. Gaps and Missing Features

### CRITICAL: TaskEditModal component is missing
- `TaskList.jsx` line 3: `import TaskEditModal from './TaskEditModal'`
- **The file `client/src/components/TaskEditModal.jsx` does not exist.**
- The "Edit" menu option will cause a runtime import error, crashing the React tree
  the first time TaskList renders.
- **Impact:** Edit is completely non-functional. This is a blocking bug.

### No success/error toast for Duplicate or Move
- Duplicate and Move silently succeed or fail with only a `console.error`.
- Delete relies on `window.confirm` but provides no success confirmation.
- Recommended: add toast notifications consistent with the existing toast used
  in `QuickAddModal` (`.fixed.bottom-6.right-6` pattern visible in e2e tests).

### No loading/spinner state during async actions
- Duplicate and Move fire fire-and-forget. The user receives no feedback while
  the network request is in flight. If the request takes >500 ms the UI feels unresponsive.

### Delete uses `window.confirm` (modal-blocking)
- `window.confirm` is synchronous, blocks the event loop, looks inconsistent with
  the app's Tailwind design, and cannot be styled. A custom in-app confirmation
  dialog or inline undo toast would be more appropriate.

### Move-to-project picker z-index conflict risk
- The `ProjectPicker` dropdown is positioned `absolute z-50` inside the context menu
  (`fixed z-[200]`). When the picker is taller than the remaining viewport height below
  the context menu, the picker can clip outside the viewport. The context menu itself
  clips its overflow via the outer fixed container rather than repositioning the picker.

### No keyboard shortcut for context menu
- The three-dot button is accessible via Tab + Enter but there is no keyboard shortcut
  (e.g., pressing `Menu` key or `Shift+F10` on the focused task row) to open the menu
  directly from the row.

### Duplicate does not copy labels/tags
- If the task data model supports labels or tags, they are not included in the
  duplicate payload. The `handleDuplicate` function only copies `title`, `description`,
  `project_id`, `section_id`, `priority`, `due_date`, `due_time`.

### No existing Playwright e2e test covers context-menu actions
- `tests/e2e/tasks.spec.ts` covers API CRUD and quick-add modal, but contains no
  tests for right-click context menu, duplicate, move-to-project, or the edit modal.

---

## 5. Accessibility Review

| Aspect | Status |
|--------|--------|
| Menu container has `role="menu"` and `aria-label="Task options"` | PASS |
| Each item has `role="menuitem"` | PASS |
| Move-to-project button has `aria-haspopup` and `aria-expanded` | PASS |
| Delete button uses semantic red color only (no icon-only) | PASS |
| Escape key closes menu | PASS |
| Focus is NOT moved into the menu on open | FAIL — WCAG 2.1 §4.1.3 requires focus management for menus |
| Focus is NOT returned to the triggering element on close | FAIL |

---

## 6. Summary

The context menu architecture is well-structured and all four expected options
(Edit, Duplicate, Move to Project, Delete) are present in the UI. However:

1. **Blocking bug:** `TaskEditModal` is imported but does not exist — Edit is broken.
2. **No user feedback** for Duplicate / Move errors or successes.
3. **`window.confirm`** for Delete is inconsistent with the app's design system.
4. **No e2e test coverage** for any context-menu action.
5. **Focus management** does not meet WCAG 2.1 keyboard navigation requirements.
