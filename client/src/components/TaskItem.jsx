import { useState, useCallback, useRef, useEffect } from 'react'
import TaskContextMenu from './TaskContextMenu'

// Forward declaration — used recursively for nested sub-tasks

// Checkbox border/bg colors (priority-based, unchecked state)
const PRIORITY_COLORS = {
  1: 'bg-red-500 border-red-500',
  2: 'bg-orange-500 border-orange-500',
  3: 'bg-blue-500 border-blue-500',
  4: 'bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600',
}

// Unchecked checkbox border (priority dot colors)
const PRIORITY_BORDER = {
  1: 'border-red-500 hover:border-red-600',
  2: 'border-orange-400 hover:border-orange-500',
  3: 'border-blue-500 hover:border-blue-600',
  4: 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
}

// Small dot color (always visible beside title)
const PRIORITY_DOT = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-blue-500',
  4: 'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_LABELS = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' }

// Format due_date string (YYYY-MM-DD or ISO) into display info
function formatDueDate(rawDate) {
  if (!rawDate) return null
  try {
    const date = new Date(rawDate.includes('T') ? rawDate : rawDate + 'T00:00:00')
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (d.getTime() === today.getTime()) return { label: 'Today', overdue: false, today: true }
    if (d.getTime() === tomorrow.getTime()) return { label: 'Tomorrow', overdue: false, today: false }
    if (d < today) return {
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      overdue: true,
      today: false,
    }
    return {
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      overdue: false,
      today: false,
    }
  } catch {
    return { label: rawDate, overdue: false, today: false }
  }
}

/**
 * TaskItem — renders a single task row with right-click context menu support
 * and inline title editing (click title to edit in-place).
 *
 * Props:
 *   task             {object}  task data
 *   onEdit           {fn}      (task) => void  — open edit form for this task
 *   onDuplicated     {fn}      (newTask) => void
 *   onMoved          {fn}      (updatedTask) => void
 *   onDeleted        {fn}      (taskId) => void
 *   onToggleComplete {fn}      (task) => void
 *   onInlineUpdated  {fn}      (updatedTask) => void  — called after inline save
 */
export default function TaskItem({
  task,
  onEdit,
  onDuplicated,
  onMoved,
  onDeleted,
  onToggleComplete,
  onInlineUpdated,
}) {
  const [contextMenu, setContextMenu] = useState(null) // { x, y } or null
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef(null)

  // Keep editValue in sync if task.title changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const closeMenu = useCallback(() => setContextMenu(null), [])

  const startEditing = useCallback((e) => {
    e.stopPropagation()
    setEditValue(task.title)
    setIsEditing(true)
  }, [task.title])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditValue(task.title)
  }, [task.title])

  const saveEdit = useCallback(async () => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      cancelEditing()
      return
    }
    if (trimmed === task.title) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`http://localhost:3456/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: trimmed }),
      })
      if (res.ok) {
        const updated = await res.json()
        setIsEditing(false)
        onInlineUpdated && onInlineUpdated(updated)
      } else {
        cancelEditing()
      }
    } catch (err) {
      console.error('Inline title save failed:', err)
      cancelEditing()
    } finally {
      setIsSaving(false)
    }
  }, [editValue, task.title, task.id, cancelEditing, onInlineUpdated])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }, [saveEdit, cancelEditing])

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[4]
  const priorityLabel = PRIORITY_LABELS[task.priority] || 'P4'

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={[
          'group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-default select-none',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          task.completed ? 'opacity-50' : '',
        ].join(' ')}
        role="listitem"
        aria-label={task.title}
      >
        {/* Completion checkbox */}
        <button
          type="button"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          onClick={() => onToggleComplete && onToggleComplete(task)}
          className={[
            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
            task.completed
              ? 'bg-green-500 border-green-500'
              : priorityColor,
          ].join(' ')}
        >
          {task.completed && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Inline editor */
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                aria-label="Edit task title"
                className={[
                  'flex-1 text-sm px-2 py-0.5 rounded border',
                  'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                  'border-blue-400 dark:border-blue-500 outline-none',
                  'focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500',
                  isSaving ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSaving}
                aria-label="Save task title"
                className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              >
                {isSaving ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                aria-label="Cancel editing"
                className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            /* Normal title display — click to edit */
            <p
              role="button"
              tabIndex={0}
              title="Click to edit title"
              onClick={startEditing}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditing(e) }}
              className={[
                'text-sm text-gray-900 dark:text-white leading-snug cursor-text',
                'hover:underline hover:decoration-dotted',
                task.completed ? 'line-through text-gray-400 dark:text-gray-500' : '',
              ].join(' ')}
            >
              {task.title}
              {task.pomodoros_done > 0 && (
                <span className="ml-1.5 text-sm" title={`${task.pomodoros_done} pomodoro${task.pomodoros_done !== 1 ? 's' : ''} completed`} aria-label={`${task.pomodoros_done} pomodoros done`}>
                  {'🍅'.repeat(Math.min(task.pomodoros_done, 5))}
                </span>
              )}
            </p>
          )}
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.due_date && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {task.due_date}
              </span>
            )}
            {task.priority && task.priority !== 4 && (
              <span className={[
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                task.priority === 1 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                task.priority === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
              ].join(' ')}>
                {priorityLabel}
              </span>
            )}
          </div>
        </div>

        {/* More options button (visible on hover, hidden while editing) */}
        {!isEditing && (
          <button
            type="button"
            aria-label="Task options"
            onClick={(e) => {
              e.stopPropagation()
              setContextMenu({ x: e.clientX, y: e.clientY })
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all focus:outline-none focus:opacity-100"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10.5 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z" />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <TaskContextMenu
          task={task}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeMenu}
          onEdit={onEdit}
          onDuplicate={onDuplicated}
          onMoved={onMoved}
          onDelete={onDeleted}
        />
      )}
    </>
  )
}
