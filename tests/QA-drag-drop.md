# QA: Drag-and-Drop Manual Test Report

## DnD Library

**Library:** `@dnd-kit` (three packages)
- `@dnd-kit/core` ^6.3.1 — `DndContext`, `DragOverlay`, `PointerSensor`, `closestCenter`
- `@dnd-kit/sortable` ^10.0.0 — `SortableContext`, `useSortable`, `arrayMove`, `verticalListSortingStrategy`
- `@dnd-kit/utilities` ^3.2.2 — `CSS.Transform.toString`

---

## What Is Draggable

| Entity | Draggable? | Component | Notes |
|---|---|---|---|
| Regular projects (sidebar) | YES | `SortableProject` in `Sidebar.jsx` | Grip icon (6-dot handle), hidden until hover |
| Inbox project | NO | Static `<div>` in `Sidebar.jsx` | Pinned at top, no `useSortable`, no drag handle |
| Tasks | NO | `TaskItem.jsx` | No `useSortable` or DnD hooks — task reordering is backend-capable but UI not wired |
| Subtasks | NO | Not inspected in list | No DnD implementation found |

---

## Supported Operations

### Project Reordering (Sidebar) — IMPLEMENTED
- **Trigger:** Grab the 6-dot grip icon (appears on hover) on any regular project in the sidebar.
- **Activation constraint:** `distance: 5px` — prevents accidental drags on click.
- **Collision detection:** `closestCenter` strategy.
- **Visual feedback:**
  - Dragged item fades to `opacity: 0.4`.
  - `DragOverlay` renders a floating ghost card (white/dark background, shadow, border).
- **On drop:** `arrayMove` produces the new order; optimistic local state update applied immediately.
- **Error recovery:** If the API call fails, `fetchProjects()` is called to revert state.
- **Constraint:** Inbox project is excluded from the sortable context and cannot be reordered.

### Task Reordering Within Project — NOT IMPLEMENTED (UI gap)
- `TaskList.jsx` renders tasks with a plain `<div role="list">` — no `DndContext`, no `useSortable`.
- `TaskItem.jsx` has no drag handle and no `useSortable` hook.
- **Backend is ready:** `POST /api/tasks/reorder` exists and accepts `{ tasks: [{ id, sort_order }] }`.

### Moving Tasks Between Projects via Drag — NOT IMPLEMENTED (UI gap)
- No cross-list DnD is wired anywhere in the frontend.
- **Backend is ready:** `POST /api/tasks/reorder` accepts an optional `project_id` field per task, enabling cross-project moves in a single bulk call. `PUT /api/tasks/:id` also accepts `project_id` for individual moves.
- **Workaround exists:** "Move to project" is available via the right-click context menu (`TaskContextMenu.jsx`) which calls `PUT /api/tasks/:id` with the new `project_id`.

---

## API Endpoints Called On Drop

| Action | Endpoint | Method | Payload |
|---|---|---|---|
| Reorder projects | `/api/projects/reorder` | POST | `{ projects: [{ id, sort_order }] }` |
| Reorder tasks (backend only) | `/api/tasks/reorder` | POST | `{ tasks: [{ id, sort_order, project_id? }] }` |
| Move task between projects (context menu) | `/api/tasks/:id` | PUT | `{ project_id, section_id }` |

---

## Code-Review Findings

### Strengths
1. **Optimistic UI** on project reorder with automatic revert on network error — good UX pattern.
2. **Activation constraint** (`distance: 5`) correctly prevents accidental drags on click.
3. **Inbox pinned** — inbox cannot be accidentally reordered, which matches Todoist behavior.
4. **Backend reorder endpoint** for tasks already supports cross-project moves in a single round-trip.
5. **DragOverlay** provides clear visual feedback during drag.
6. **Accessible** — drag handle has `aria-label="Drag to reorder"`, projects have `role="button"` and keyboard `onKeyDown` handlers.

### Gaps / Issues

| # | Severity | Gap | Detail |
|---|---|---|---|
| 1 | HIGH | Task drag-to-reorder not implemented | `TaskList` / `TaskItem` have no DnD. Backend endpoint exists. Frontend work required. |
| 2 | HIGH | Cross-project task drag not implemented | No `DndContext` wrapping multiple project lists. Only context-menu workaround. |
| 3 | MEDIUM | `Sidebar.jsx` uses `fetch` directly (not `credentials: 'include'`) for reorder endpoint | Token passed via `Authorization` header but inconsistent with other API calls using `credentials: 'include'`. |
| 4 | MEDIUM | No error toast on reorder failure | Network failure silently reverts state. User receives no notification that the reorder was lost. |
| 5 | LOW | `DragOverlay` ghost card does not match `SortableProject` exactly | Ghost omits task count badge; minor visual inconsistency. |
| 6 | LOW | Touch sensor not configured | Only `PointerSensor` is registered; `TouchSensor` is not added. Mobile drag may work via pointer events on some browsers but is untested. |
| 7 | LOW | `App.jsx` sidebar `<aside>` is a placeholder | The `Sidebar` component exists but is not rendered inside `App.jsx` — `<aside>` is an empty gray block. Integration not yet wired up in the main layout. |

---

## Test Scenarios (Manual QA Checklist)

### Project Reordering
- [ ] Hover a regular project — grip icon appears
- [ ] Click project without dragging — selection works, no accidental drag
- [ ] Drag project up/down — ghost overlay appears, item fades
- [ ] Drop in new position — order updates instantly (optimistic)
- [ ] Reload page — new order persists (database persisted)
- [ ] Drag Inbox — should NOT be draggable (no grip icon)
- [ ] Simulate network error during drop — order should revert

### Task Reordering (BLOCKED — not implemented)
- [ ] PENDING: implement `useSortable` in `TaskItem` and `DndContext` in `TaskList`

### Moving Tasks Between Projects via Context Menu (workaround)
- [ ] Right-click a task — context menu appears
- [ ] Click "Move to project" — project picker expands
- [ ] Select a different project — task disappears from current view
- [ ] Navigate to target project — task appears there

### Moving Tasks Between Projects via Drag (BLOCKED — not implemented)
- [ ] PENDING: implement multi-list DnD across project views

---

## Summary

The drag-and-drop implementation is **partially complete**. Project reordering in the sidebar is fully implemented with optimistic UI, error recovery, and a working backend endpoint. Task drag-and-drop (both within-project reordering and cross-project moves) is **not implemented on the frontend**, though the backend endpoints (`POST /api/tasks/reorder`) are present and ready to use. Moving tasks between projects is possible only via the right-click context menu workaround.
