import { useEffect, useRef, useState } from 'react'
import ProjectPicker from './ProjectPicker'

const API_BASE = 'http://localhost:3456'

/**
 * TaskContextMenu — right-click context menu for a task.
 *
 * Props:
 *   task         {object}  the task being acted upon
 *   x, y         {number}  mouse coordinates where the menu should appear
 *   onClose      {fn}      called when the menu should be dismissed
 *   onEdit       {fn}      called with (task) to open edit form
 *   onDuplicate  {fn}      called with (task) after duplicate succeeds
 *   onMoved      {fn}      called with (updatedTask) after move-to-project
 *   onDelete     {fn}      called with (taskId) after delete succeeds
 */
export default function TaskContextMenu({
  task,
  x,
  y,
  onClose,
  onEdit,
  onDuplicate,
  onMoved,
  onDelete,
}) {
  const menuRef = useRef(null)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: y, left: x })

  // Adjust position so menu doesn't go off-screen
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const MARGIN = 8

    let top = y
    let left = x

    if (left + rect.width + MARGIN > vw) {
      left = vw - rect.width - MARGIN
    }
    if (top + rect.height + MARGIN > vh) {
      top = vh - rect.height - MARGIN
    }
    if (top < MARGIN) top = MARGIN
    if (left < MARGIN) left = MARGIN

    setMenuPos({ top, left })
  }, [x, y])

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  async function handleDuplicate() {
    onClose()
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: task.title + ' (copy)',
          description: task.description || '',
          project_id: task.project_id || undefined,
          section_id: task.section_id || undefined,
          priority: task.priority,
          due_date: task.due_date || undefined,
          due_time: task.due_time || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onDuplicate && onDuplicate(data.task)
      }
    } catch (err) {
      console.error('Duplicate task failed:', err)
    }
  }

  async function handleMoveToProject({ projectId, sectionId }) {
    setShowProjectPicker(false)
    onClose()
    try {
      const body = {
        project_id: projectId || null,
        section_id: sectionId || null,
      }
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onMoved && onMoved(data.task)
      }
    } catch (err) {
      console.error('Move task failed:', err)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    onClose()
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        onDelete && onDelete(task.id)
      }
    } catch (err) {
      console.error('Delete task failed:', err)
    }
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Task options"
      style={{ top: menuPos.top, left: menuPos.left }}
      className="fixed z-[200] min-w-[180px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 text-sm"
    >
      {/* Edit */}
      <button
        role="menuitem"
        onClick={() => { onClose(); onEdit && onEdit(task) }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>

      {/* Duplicate */}
      <button
        role="menuitem"
        onClick={handleDuplicate}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Duplicate
      </button>

      {/* Move to project — expands inline picker */}
      <div className="relative">
        <button
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={showProjectPicker}
          onClick={() => setShowProjectPicker((prev) => !prev)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Move to project
          <svg
            className={`w-3.5 h-3.5 ml-auto transition-transform ${showProjectPicker ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {showProjectPicker && (
          <div className="px-3 pb-2">
            <ProjectPicker
              value={task.project_id ? String(task.project_id) : ''}
              onChange={handleMoveToProject}
              placeholder="No project (Inbox)"
              apiBase={API_BASE}
            />
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

      {/* Delete */}
      <button
        role="menuitem"
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  )
}
