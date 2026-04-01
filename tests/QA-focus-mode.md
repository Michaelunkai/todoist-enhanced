# QA Report: Focus Mode

**Date:** 2026-03-31
**Component:** FocusMode (App.jsx + PomodoroTimer.jsx)
**Status:** PARTIAL — core toggle works; Pomodoro NOT connected to UI

---

## Implementation Details

### State Management
- State held in `App.jsx`: `isFocusMode` (boolean), initialised from `sessionStorage.getItem('focusMode')`
- Toggle function: `toggleFocusMode()` — flips state and persists new value to `sessionStorage` key `'focusMode'`
- State also duplicated in `AppContext.jsx` (`AppProvider`) but App passes its own state as external value via `<AppProvider value={{ isFocusMode, toggleFocusMode }}>`, so the context version is never the source of truth

---

## Keyboard Shortcut

| Shortcut | Handler | File |
|---|---|---|
| `Ctrl + Shift + F` | `callbacks.onToggleFocusMode?.()` | `hooks/useKeyboardShortcuts.js` line 114 |

- Registered as a global `keydown` listener on `window`
- Does NOT fire when focus is inside an `<input>` or `<textarea>` (guarded by `isTypingTarget()` check)
- Note: key check is `e.key === 'F'` (capital F), which means `Shift` is implicitly required by the key value itself; the explicit `e.shiftKey` check is redundant but harmless

---

## What Gets Hidden / Shown

### When Focus Mode is ON (`isFocusMode === true`):
| Element | Behaviour |
|---|---|
| **TopBar** | Hidden — `className={isFocusMode ? 'hidden' : ''}` applied to `<TopBar>` (Tailwind `hidden` = `display: none`) |
| **Sidebar (`<aside>`)** | Collapsed — condition `sidebarOpen && !isFocusMode` becomes false, so `w-64 -translate-x-full` + `marginLeft: '-16rem'` applied (slides off-screen) |
| **Main content** | Narrowed — `<main>` gets `max-w-2xl mx-auto` (centred reading column, ~672px wide) |
| **Exit Focus button** | Shown — fixed top-right `z-50` button with "Exit Focus ✕" text |

### When Focus Mode is OFF:
- All elements return to normal layout
- Exit button is removed from DOM (conditional render)

---

## Pomodoro Timer Integration Status

### Component exists: YES
`client/src/components/PomodoroTimer.jsx` is a fully implemented standalone component.

### Features implemented in the component:
- 25-minute work session / 5-minute break auto-cycle
- Circular SVG progress ring (red for Focus, green for Break)
- Pause / Resume button
- Reset button (resets to 25:00 work session, auto-starts)
- Starts running automatically (`isRunning` initialised to `true`)
- `onExit` prop — calls a passed callback to exit Focus Mode
- Phase label ("Focus Session" / "Break Time")
- Accessible: `role="timer"`, `aria-label` with time remaining

### Is PomodoroTimer rendered in the app: NO (BUG)
- `PomodoroTimer` is **imported** in `App.jsx` (line 6) but is **never rendered** in the JSX
- The import is a dead import — the component is built but not wired up
- When Focus Mode is toggled ON, only the exit button in the top-right corner appears; no Pomodoro overlay is shown

---

## Missing Features to Implement

### Critical (breaks expected UX)
1. **Wire PomodoroTimer into App.jsx** — render `<PomodoroTimer onExit={toggleFocusMode} />` conditionally when `isFocusMode === true`; remove the manual exit button (PomodoroTimer has its own exit button)
2. **TopBar isFocusMode/onToggleFocusMode props not consumed** — `TopBar` receives `isFocusMode` and `onToggleFocusMode` as props but the component (`TopBar.jsx`) does not use them; a Focus Mode toggle button in the TopBar is not rendered

### Minor / Enhancements
3. **Keyboard shortcut fires inside inputs** — the `isTypingTarget` guard exists but the Ctrl+Shift+F handler is placed BEFORE that guard check in the flow; if `isTypingTarget` returns true the function returns early on line 65, so this is actually fine — but should be verified with a test
4. **sessionStorage persistence on hard reload** — works correctly; state reads from sessionStorage on mount, so a page refresh preserves Focus Mode state
5. **No toast notification on toggle** — other shortcuts show toasts; Focus Mode entry/exit is silent; consider `showToast('Focus Mode ON')` / `showToast('Focus Mode OFF')` for discoverability
6. **Exit button z-index conflict** — exit button is `z-50`; PomodoroTimer overlay is `z-40`; once PomodoroTimer is wired in, the standalone exit button should be removed to avoid z-index conflicts
7. **Focus trap** — when Focus Mode / Pomodoro overlay is active, keyboard focus is not trapped inside the overlay; Tab can still reach hidden TopBar elements

---

## Verification Checklist

- [x] Keyboard shortcut `Ctrl+Shift+F` defined in `useKeyboardShortcuts.js` line 114
- [x] Toggle logic correctly flips state and persists to `sessionStorage`
- [x] TopBar hidden via Tailwind `hidden` class when `isFocusMode === true`
- [x] Sidebar hidden via `translate-x-full` + negative marginLeft when `isFocusMode === true`
- [x] Exit button rendered as fixed top-right element when `isFocusMode === true`
- [x] Exit button calls `toggleFocusMode()` correctly
- [x] `PomodoroTimer` component fully implemented with auto-start, controls, progress ring
- [ ] **FAIL: PomodoroTimer NOT rendered** — dead import; Pomodoro does not appear in Focus Mode
- [ ] **FAIL: TopBar Focus Mode button** — props passed but not consumed by TopBar component
