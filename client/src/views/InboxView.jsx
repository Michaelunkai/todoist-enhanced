import { useState, useEffect, useCallback } from 'react'
import TaskList from '../components/TaskList'

const API_BASE = 'http://localhost:3456'

/**
 * InboxView — displays tasks with no project_id, sorted by added_date desc.
 * Fetches from GET /api/views/inbox.
 * Shows an empty state illustration when there are no tasks.
 *
 * Props:
 *   token  {string|null}  JWT auth token (optional; passed as Authorization header if provided)
 */
export default function InboxView({ token }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInboxTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/api/views/inbox`, { headers })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      // Sort by created_at desc (added_date desc) as a client-side safety sort
      const sorted = [...(data.tasks || [])].sort((a, b) => {
        const da = new Date(a.created_at || 0)
        const db = new Date(b.created_at || 0)
        return db - da
      })
      setTasks(sorted)
    } catch (err) {
      console.error('InboxView fetch error:', err)
      setError('Failed to load inbox tasks.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchInboxTasks()
  }, [fetchInboxTasks])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40"
          aria-hidden="true"
        >
          <svg
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </span>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
            Inbox
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tasks not assigned to any project
          </p>
        </div>
        {!loading && tasks.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3" aria-live="polite" aria-label="Loading inbox tasks">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center py-12 gap-3 text-center"
        >
          <svg
            className="w-12 h-12 text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>
          <button
            type="button"
            onClick={fetchInboxTasks}
            className="mt-1 text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state illustration */}
      {!loading && !error && tasks.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4 text-center select-none"
          aria-label="No inbox tasks"
        >
          {/* Illustration */}
          <svg
            className="w-28 h-28 text-indigo-200 dark:text-indigo-900"
            viewBox="0 0 120 120"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* tray body */}
            <rect x="15" y="60" width="90" height="40" rx="8" opacity="0.6" />
            {/* tray opening arc */}
            <path
              d="M15 60 Q20 80 35 80 L85 80 Q100 80 105 60 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.4"
            />
            {/* floating check circle */}
            <circle cx="60" cy="36" r="22" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
            <path
              d="M50 36 l7 7 13-13"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* sparkles */}
            <circle cx="22" cy="28" r="3" opacity="0.3" />
            <circle cx="98" cy="32" r="2.5" opacity="0.25" />
            <circle cx="88" cy="18" r="2" opacity="0.2" />
          </svg>

          <div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
              Your inbox is empty
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
              Tasks you add without a project will appear here. Use{' '}
              <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                Q
              </kbd>{' '}
              to quickly add a task.
            </p>
          </div>
        </div>
      )}

      {/* Task list */}
      {!loading && !error && tasks.length > 0 && (
        <TaskList
          tasks={tasks}
          onRefresh={fetchInboxTasks}
          emptyMessage="Your inbox is empty."
        />
      )}
    </div>
  )
}
