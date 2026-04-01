# Keyboard Shortcuts Audit

**Project:** TODOIST-ENHANCED
**Date:** 2026-03-31
**Auditor:** Claude Code (RLP todo #46)

---

## Summary

The app defines 11 keyboard shortcuts across multiple components. The `useKeyboardShortcuts` hook
implements all shortcut logic via a callbacks-object API, but **App.jsx only uses the legacy array
API** (registering a single Ctrl+Q handler). As a result, 8 of 10 shortcuts defined in the hook
were dead code at the app level before the fixes applied in this audit.

Additionally, `ShortcutsHelpModal` was never imported or mounted in `App.jsx`, making the `?`
shortcut and the shortcuts-help UI completely inaccessible.

---

## Shortcut Inventory

| # | Key Combination | Expected Behavior | Implementation File:Line | Status (before fix) |
|---|----------------|-------------------|--------------------------|---------------------|
| 1 | `Ctrl+K` | Focus the search input in TopBar | `TopBar.jsx:12-18` | **IMPLEMENTED** (not listed in help modal) |
| 2 | `Ctrl+Q` | Open QuickAddModal | `App.jsx:77-79` (array API) + `useKeyboardShortcuts.js:99-104` (callbacks API) | **IMPLEMENTED** (duplicate registration) |
| 3 | `Q` (plain) | Add task in current view | `useKeyboardShortcuts.js:105-110` via `callbacks.onAddTask` | **MISSING** — `onAddTask` never passed from App.jsx |
| 4 | `g` then `h` | Navigate to Home view | `useKeyboardShortcuts.js:72-87` via `callbacks.onNavigate('home')` | **MISSING** — `onNavigate` never wired in App.jsx |
| 5 | `g` then `i` | Navigate to Inbox view | `useKeyboardShortcuts.js:72-87` via `callbacks.onNavigate('inbox')` | **MISSING** — `onNavigate` never wired in App.jsx |
| 6 | `g` then `t` | Navigate to Today view | `useKeyboardShortcuts.js:72-87` via `callbacks.onNavigate('today')` | **MISSING** — `onNavigate` never wired in App.jsx |
| 7 | `g` then `u` | Navigate to Upcoming view | `useKeyboardShortcuts.js:72-87` via `callbacks.onNavigate('upcoming')` | **MISSING** — `onNavigate` never wired in App.jsx |
| 8 | `?` | Show keyboard shortcuts help modal | `useKeyboardShortcuts.js:121-125` via `callbacks.onShowHelp` | **MISSING** — `onShowHelp` never wired; `ShortcutsHelpModal` never mounted |
| 9 | `Escape` | Close any open modal/panel | `useKeyboardShortcuts.js:128-131,148-151` + `QuickAddModal.jsx:34-42` + `ShortcutsHelpModal.jsx:18-26` | **PARTIAL** — works inside QuickAddModal/ShortcutsHelpModal directly; `onEscape` never wired in App.jsx for global close |
| 10 | `Delete` / `Backspace` | Delete selected task | `useKeyboardShortcuts.js:134-140` via `callbacks.onDeleteTask` | **MISSING** — `onDeleteTask` never wired in App.jsx |
| 11 | `Ctrl+Shift+F` | Toggle Focus Mode | `useKeyboardShortcuts.js:113-118` via `callbacks.onToggleFocusMode` | **MISSING** — `onToggleFocusMode` never wired in App.jsx |

---

## Root Cause Analysis

`App.jsx` calls `useKeyboardShortcuts` twice (once per render cycle) using the **legacy array API**:

```js
// App.jsx line 77-79 — only registers Ctrl+Q
useKeyboardShortcuts([
  { key: 'q', ctrl: true, handler: () => setQuickAddOpen((prev) => !prev) },
])
```

The hook supports two APIs:
- **Array API** (legacy) — list of `{ key, ctrl, handler }` descriptors, no sequence support.
- **Callbacks object API** (full) — object with named callbacks (`onNavigate`, `onQuickAdd`,
  `onShowHelp`, `onEscape`, `onDeleteTask`, `onToggleFocusMode`, `onAddTask`), supports the `g+x`
  two-key chord sequences.

App.jsx never calls the callbacks API, so all named callbacks are dead code at the app level.

---

## Fixes Applied

### 1. App.jsx — wire callbacks object API + mount ShortcutsHelpModal

**Changes:**
- Added `import ShortcutsHelpModal` at top of App.jsx.
- Added `shortcutsHelpOpen` state.
- Replaced legacy array-API `useKeyboardShortcuts` call with the callbacks-object API, passing:
  - `onQuickAdd` → opens QuickAddModal
  - `onAddTask` → opens QuickAddModal (plain Q)
  - `onShowHelp` → opens ShortcutsHelpModal
  - `onEscape` → closes whichever modal is open
  - `onDeleteTask` → shows toast (task deletion requires a selected-task system not yet built)
  - `onNavigate` → shows toast with navigation target (navigation views not yet built)
  - `onToggleFocusMode` → calls existing `toggleFocusMode`
- Mounted `<ShortcutsHelpModal>` in JSX.

### 2. ShortcutsHelpModal — added Ctrl+K to the displayed shortcuts list

Added entry `{ key: 'Ctrl+K', action: 'Focus search' }` so the modal matches all implemented shortcuts.

---

## Post-Fix Status

| # | Key | Status |
|---|-----|--------|
| 1 | Ctrl+K | IMPLEMENTED |
| 2 | Ctrl+Q | IMPLEMENTED |
| 3 | Q | IMPLEMENTED |
| 4-7 | g+h/i/t/u | IMPLEMENTED (shows toast; full routing not built) |
| 8 | ? | IMPLEMENTED |
| 9 | Escape | IMPLEMENTED |
| 10 | Delete | IMPLEMENTED (shows toast; task selection system not built) |
| 11 | Ctrl+Shift+F | IMPLEMENTED |

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/App.jsx` | Added ShortcutsHelpModal import + state + callbacks-API hook call + JSX mount |
| `client/src/components/ShortcutsHelpModal.jsx` | Added Ctrl+K entry to SHORTCUTS list |
