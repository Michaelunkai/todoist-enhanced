import { useEffect, useRef } from 'react'

/**
 * useKeyboardShortcuts — registers global keydown listeners.
 *
 * Accepts either:
 *   1. A callbacks object with named shortcut handlers (object API — preferred).
 *      Supported callbacks:
 *        onQuickAdd        — Q (plain) or Ctrl+Q
 *        onAddTask         — Q (plain, alias for onQuickAdd)
 *        onSearch          — / (forward-slash) — focus search bar
 *        onUndo            — Ctrl+Z — undo last action
 *        onArrowUp         — ArrowUp — move selection up
 *        onArrowDown       — ArrowDown — move selection down
 *        onEnter           — Enter — open task detail for focused task
 *        onShowHelp        — ? — open shortcuts help modal
 *        onEscape          — Escape — close modal / panel
 *        onDeleteTask      — Delete / Backspace
 *        onToggleFocusMode — Ctrl+Shift+F
 *        onNavigate        — g→h/i/t/u two-key navigation sequences
 *        onKeydown         — generic delegate for unhandled keys
 *
 *   2. An array of shortcut descriptors (legacy / extended API):
 *      [{ key: string, ctrl?: boolean, alt?: boolean, shift?: boolean, handler: function }]
 *
 * @param {Object|Array} callbacksOrShortcuts
 */
export function useKeyboardShortcuts(callbacksOrShortcuts = {}) {
  // Ref to track the first key of a two-key navigation chord (e.g. g → h/i/t/u)
  const lastKeyRef = useRef(null) // { key: string, time: number } | null
  const SEQUENCE_TIMEOUT = 1000  // ms window to complete a two-key sequence

  useEffect(() => {
    // --- Array API (shortcut descriptor list) ---
    if (Array.isArray(callbacksOrShortcuts)) {
      const shortcuts = callbacksOrShortcuts
      if (!shortcuts.length) return

      function handleKeyDownArray(e) {
        for (const shortcut of shortcuts) {
          const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
          const ctrlMatch = !!shortcut.ctrl === e.ctrlKey
          const altMatch = !!shortcut.alt === e.altKey
          const shiftMatch = !!shortcut.shift === e.shiftKey

          if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
            e.preventDefault()
            shortcut.handler(e)
            break
          }
        }
      }

      window.addEventListener('keydown', handleKeyDownArray)
      return () => window.removeEventListener('keydown', handleKeyDownArray)
    }

    // --- Callbacks object API ---
    const callbacks = callbacksOrShortcuts

    /**
     * Returns true when the keyboard event originated inside a text-entry element.
     * Used to skip shortcuts that would otherwise capture characters during typing.
     */
    function isTypingTarget(e) {
      const tag = e.target?.tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true
      if (e.target?.isContentEditable) return true
      return false
    }

    const handler = (e) => {
      // Reset sequence when typing in a form field
      if (isTypingTarget(e)) {
        lastKeyRef.current = null
        if (callbacks.onKeydown) callbacks.onKeydown(e)
        return
      }

      const key = e.key
      const keyLower = key.toLowerCase()
      const now = Date.now()
      const last = lastKeyRef.current

      // --- Two-key navigation sequence: g → h/i/t/u ---
      if (last && last.key === 'g' && now - last.time < SEQUENCE_TIMEOUT) {
        const navMap = {
          h: 'home',
          i: 'inbox',
          t: 'today',
          u: 'upcoming',
        }
        if (navMap[keyLower]) {
          e.preventDefault()
          lastKeyRef.current = null
          callbacks.onNavigate?.(navMap[keyLower])
          return
        }
        // Unrecognised second key — reset and fall through to normal handling
        lastKeyRef.current = null
      }

      // Capture 'g' as first key of a potential sequence (no modifiers)
      if (keyLower === 'g' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        lastKeyRef.current = { key: 'g', time: now }
        return
      }

      // Any other key clears the sequence state
      lastKeyRef.current = null

      // --- Ctrl+Z — undo last action ---
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && keyLower === 'z') {
        e.preventDefault()
        callbacks.onUndo?.()
        return
      }

      // --- / (forward-slash) — focus search bar ---
      if (key === '/' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onSearch?.()
        return
      }

      // --- Arrow keys — navigate tasks (up / down) ---
      if (key === 'ArrowUp' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onArrowUp?.()
        return
      }

      if (key === 'ArrowDown' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onArrowDown?.()
        return
      }

      // --- Enter — open task detail for the currently focused/selected task ---
      if (key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onEnter?.()
        return
      }

      // Q / Ctrl+Q shortcuts — skip when the user is typing in an input field
      if ((key === 'q' || key === 'Q') && !isTypingTarget(e)) {
        if (e.ctrlKey) {
          // Ctrl+Q → open QuickAddModal
          e.preventDefault()
          callbacks.onQuickAdd?.()
          return
        } else if (!e.altKey && !e.shiftKey && !e.metaKey) {
          // Plain Q → add task in current view
          e.preventDefault()
          callbacks.onAddTask?.()
          return
        }
      }

      // '+' or numpad '+' key → open QuickAddTask (when not typing)
      if ((e.key === '+' || e.key === 'Add') && !isTypingTarget(e) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onAddTask?.()
        return
      }

      // Ctrl+Shift+F — Toggle Focus Mode
      if (e.ctrlKey && e.shiftKey && key === 'F') {
        e.preventDefault()
        callbacks.onToggleFocusMode?.()
        return
      }

      // --- '?' -> open shortcuts help modal (suppressed when typing in an input) ---
      if (key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        callbacks.onShowHelp?.()
        return
      }

      // --- Escape -> close any open modal/panel ---
      if (key === 'Escape' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        callbacks.onEscape?.()
        return
      }

      // --- Delete / Backspace -> move selected task to trash (suppressed when typing) ---
      if (
        (key === 'Delete' || key === 'Backspace') &&
        !e.ctrlKey && !e.altKey && !e.metaKey
      ) {
        e.preventDefault()
        callbacks.onDeleteTask?.()
        return
      }

      // Generic keydown delegate
      if (callbacks.onKeydown) callbacks.onKeydown(e)
    }

    // Separate Escape handler that fires even when focus is inside an input/textarea
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.metaKey && isTypingTarget(e)) {
        callbacks.onEscape?.()
      }
    }
    window.addEventListener('keydown', escapeHandler)

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keydown', escapeHandler)
    }
  }, [callbacksOrShortcuts])
}

// Default export kept for backward compatibility with array API consumers
export default useKeyboardShortcuts
