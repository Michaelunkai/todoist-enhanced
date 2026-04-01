# QA Checklist — Keyboard Shortcuts

**Project:** Todoist Enhanced (React + Vite + Tailwind)
**Date:** 2026-03-31
**Method:** Code verification (browser interactive test not run)
**Sources:**
- `client/src/hooks/useKeyboardShortcuts.js` — global shortcut hook (callbacks-object API)
- `client/src/App.jsx` — shortcut registrations and handlers
- `client/src/components/TopBar.jsx` — Ctrl+K inline handler
- `client/src/components/ShortcutsHelpModal.jsx` — SHORTCUTS constant + Escape listener
- `client/src/components/QuickAddModal.jsx` — Escape listener

---

## Shortcuts Registry

| # | Shortcut | Component / File | Handler Registered | Expected Behavior | Notes | Status |
|---|----------|------------------|--------------------|-------------------|-------|--------|
| 1 | `Ctrl+K` | `TopBar.jsx` L11-18 | `document.addEventListener('keydown')` in `useEffect` | Focuses the search input (`searchRef.current?.focus()`) | Inline handler, independent of `useKeyboardShortcuts` hook | Code-verified |
| 2 | `Q` (plain) | `useKeyboardShortcuts.js` L99-110 | `useKeyboardShortcuts` callbacks API via `onAddTask` | Opens QuickAddModal (`setQuickAddOpen(true)`) | Suppressed when focus is inside INPUT/TEXTAREA/contentEditable | Code-verified |
| 3 | `Ctrl+Q` | `useKeyboardShortcuts.js` L100-103 | `useKeyboardShortcuts` callbacks API via `onQuickAdd` | Toggles QuickAddModal open/close | Takes priority over plain Q when Ctrl is held | Code-verified |
| 4 | `g` then `h` | `useKeyboardShortcuts.js` L72-87 | Two-key chord sequence in `useKeyboardShortcuts` | Calls `onNavigate('home')` → shows toast "Navigate to: home (routing coming soon)" | Chord window is 1000 ms; suppressed during typing | Code-verified |
| 5 | `g` then `i` | `useKeyboardShortcuts.js` L72-87 | Two-key chord sequence in `useKeyboardShortcuts` | Calls `onNavigate('inbox')` → shows toast "Navigate to: inbox (routing coming soon)" | Same chord logic as g+h | Code-verified |
| 6 | `g` then `t` | `useKeyboardShortcuts.js` L72-87 | Two-key chord sequence in `useKeyboardShortcuts` | Calls `onNavigate('today')` → shows toast "Navigate to: today (routing coming soon)" | Same chord logic as g+h | Code-verified |
| 7 | `g` then `u` | `useKeyboardShortcuts.js` L72-87 | Two-key chord sequence in `useKeyboardShortcuts` | Calls `onNavigate('upcoming')` → shows toast "Navigate to: upcoming (routing coming soon)" | Same chord logic as g+h | Code-verified |
| 8 | `?` | `useKeyboardShortcuts.js` L121-125 | `useKeyboardShortcuts` callbacks API via `onShowHelp` | Opens ShortcutsHelpModal (`setShortcutsHelpOpen(true)`) | Suppressed when typing in input; Shift not required (key value '?' already implies Shift) | Code-verified |
| 9 | `Escape` | `useKeyboardShortcuts.js` L128-131 + escapeHandler L148-152 | Two listeners: main handler (non-input targets) + dedicated escapeHandler (input targets) | Closes ShortcutsHelpModal first; then closes QuickAddModal if open | Works even when focus is inside an input field (escapeHandler covers this) | Code-verified |
| 10 | `Delete` | `useKeyboardShortcuts.js` L134-141 | `useKeyboardShortcuts` callbacks API via `onDeleteTask` | Shows toast "Select a task first to delete it" | Task selection not yet implemented; `Backspace` also triggers this handler | Code-verified |
| 11 | `Backspace` | `useKeyboardShortcuts.js` L134-141 | Same handler as Delete | Same toast as Delete | Suppressed during typing (only fires outside inputs) | Code-verified |
| 12 | `Ctrl+Shift+F` | `useKeyboardShortcuts.js` L114-118 | `useKeyboardShortcuts` callbacks API via `onToggleFocusMode` | Toggles Focus Mode; persists state to `sessionStorage('focusMode')` | TopBar and sidebar are hidden when Focus Mode is active; exit button appears top-right | Code-verified |

---

## Modal-level Escape Handlers (redundant safety net)

| Modal | File | Listener | Behavior |
|-------|------|----------|----------|
| `QuickAddModal` | `QuickAddModal.jsx` L34-39 | `document.addEventListener` inside `useEffect` when `isOpen` | Calls `onClose()` on any Escape press |
| `ShortcutsHelpModal` | `ShortcutsHelpModal.jsx` L19-27 | `document.addEventListener` inside `useEffect` when `isOpen` | Calls `onClose()` on any Escape press |

Both modals also close when the user clicks the backdrop overlay (checks `e.target === e.currentTarget`).

---

## Shortcut Scope Rules (from useKeyboardShortcuts.js)

- **`isTypingTarget(e)`** — returns `true` when focus is in `INPUT`, `TEXTAREA`, or `contentEditable`. When true, the following shortcuts are suppressed: `Q`, plain `g` chord initiation, `?`, `Delete`/`Backspace`.
- **Escape** is NOT suppressed during typing — a dedicated `escapeHandler` fires regardless of focus target.
- **Ctrl+K** is handled outside the hook (directly in `TopBar.jsx`) and is NOT suppressed during typing.
- **Ctrl+Q**, **Ctrl+Shift+F** — modifier-key shortcuts bypass the typing guard naturally (ctrlKey/shiftKey checked explicitly).

---

## Known Gaps / Implementation Notes

| Item | Detail |
|------|--------|
| `Ctrl+N` UI label | TopBar "Add Task" button shows `(Ctrl+N)` label in its tooltip, but **no Ctrl+N handler is registered anywhere in the codebase**. The actual shortcut is `Ctrl+Q` / `Q`. This is a UI/label discrepancy. |
| Navigation routing | `g+h/i/t/u` chords show a toast instead of navigating — routing not yet implemented (`App.jsx` L97). |
| Delete task | No task selection system exists yet; Delete/Backspace always shows the "Select a task first" toast. |
| Backspace not in help modal | The `SHORTCUTS` constant in `ShortcutsHelpModal.jsx` lists only `Delete`, but `Backspace` also triggers `onDeleteTask`. |

---

## Manual Browser QA Steps (to run when app is live)

1. Open app at `http://localhost:3456` (or Vite dev server port).
2. **Ctrl+K** — verify search input receives focus.
3. **Q** (from non-input focus) — verify QuickAddModal opens.
4. **Ctrl+Q** — verify QuickAddModal toggles open/closed.
5. **g, h** (within 1 s) — verify toast "Navigate to: home (routing coming soon)".
6. **g, i** — verify toast "Navigate to: inbox (routing coming soon)".
7. **g, t** — verify toast "Navigate to: today (routing coming soon)".
8. **g, u** — verify toast "Navigate to: upcoming (routing coming soon)".
9. **?** — verify ShortcutsHelpModal opens showing all 11 listed shortcuts.
10. **Escape** — with QuickAddModal open, verify modal closes; with ShortcutsHelpModal open, verify modal closes.
11. **Escape** while typing in an input — verify modal closes (escapeHandler fires even in inputs).
12. **Delete** — verify toast "Select a task first to delete it".
13. **Backspace** (outside input) — verify same toast as Delete.
14. **Ctrl+Shift+F** — verify TopBar/sidebar hide, focus mode exit button appears, second press restores layout.
15. **Q while typing in search bar** — verify NO modal opens (suppression test).
16. **g, x** (unrecognised second key) — verify chord resets with no side effect.
