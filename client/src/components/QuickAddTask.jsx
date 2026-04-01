import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = 'http://localhost:3456'

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'P1', bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500' },
  { value: 'p2', label: 'P2', bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500' },
  { value: 'p3', label: 'P3', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500' },
  { value: 'p4', label: 'P4', bg: 'bg-gray-400', border: 'border-gray-400', text: 'text-gray-400' },
]

function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getQuickDates() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  return {
    today: toLocalDateString(today),
    tomorrow: toLocalDateString(tomorrow),
    nextWeek: toLocalDateString(nextWeek),
  }
}

/**
 * QuickAddTask — modal overlay for fast task entry.
 *
 * Props:
 *   isOpen      {boolean}   — controls visibility
 *   onClose     {function}  — called to dismiss the modal
 *   onTaskAdded {function}  — called after a task is successfully created
 *   projects    {Array}     — list of project objects { id, name, color }
 */
export default function QuickAddTask({ isOpen, onClose, onTaskAdded, projects = [] }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('p4')
  const [projectId, setProjectId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const titleRef = useRef(null)
  const quickDates = getQuickDates()

  // Reset + focus when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDueDate('')
      setPriority('p4')
      setProjectId('')
      setError('')
      setSubmitting(false)
      setTimeout(() => titleRef.current?.focus(), 60)
    }
  }, [isOpen])

  // Global Q key opens modal (when not in an input/textarea)
  useEffect(() => {
    function handleGlobalKey(e) {
      if (!isOpen && e.key === 'q' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        // Bubble up to parent — callers handle setQuickAddOpen
      }
    }
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [isOpen])

  // Escape closes modal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Task name is required.')
      titleRef.current?.focus()
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        priority,
        ...(dueDate && { due_date: dueDate }),
        ...(projectId && { project_id: projectId }),
      }
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onTaskAdded && onTaskAdded()
        onClose()
      } else {
        const msg = await res.text().catch(() => 'Unknown error')
        setError(`Failed to add task: ${msg}`)
      }
    } catch (err) {
      setError(`Network error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick add task"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Add Task</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Task title */}
          <div>
            <input
              id="qat-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              placeholder="Task name…"
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          {/* Quick due-date buttons */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Due</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Today', value: quickDates.today },
                { label: 'Tomorrow', value: quickDates.tomorrow },
                { label: 'Next Week', value: quickDates.nextWeek },
              ].map(({ label, value }) => {
                const selected = dueDate === value
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDueDate(selected ? '' : value)}
                    aria-pressed={selected}
                    className={[
                      'px-3 py-1 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-red-400',
                      selected
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-500',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              })}
              {/* Manual date picker */}
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                title="Pick a specific date"
                className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Priority</span>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = priority === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    aria-pressed={selected}
                    className={[
                      'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all focus:outline-none focus:ring-2',
                      selected
                        ? `${opt.bg} text-white border-transparent shadow`
                        : `bg-transparent ${opt.text} border-current hover:opacity-75`,
                    ].join(' ')}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${selected ? 'bg-white/80' : opt.bg}`} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label htmlFor="qat-project" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Project
              </label>
              <select
                id="qat-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              {submitting ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 -mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 dark:text-gray-400">Q</kbd> or{' '}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 dark:text-gray-400">+</kbd>{' '}
          to open &nbsp;·&nbsp;{' '}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 dark:text-gray-400">Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
