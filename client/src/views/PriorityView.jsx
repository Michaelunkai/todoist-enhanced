import { useState, useEffect, useCallback } from 'react'
import TaskList from '../components/TaskList'

const API_BASE = 'http://localhost:3456'

const PRIORITY_CONFIG = {
  1: {
    label: 'Priority 1',
    shortLabel: 'P1',
    color: '#DB4035',
    bgClass: 'bg-red-50 dark:bg-red-950/20',
    borderClass: 'border-red-400',
    textClass: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  2: {
    label: 'Priority 2',
    shortLabel: 'P2',
    color: '#FF9933',
    bgClass: 'bg-orange-50 dark:bg-orange-950/20',
    borderClass: 'border-orange-400',
    textClass: 'text-orange-600 dark:text-orange-400',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  3: {
    label: 'Priority 3',
    shortLabel: 'P3',
    color: '#4073FF',
    bgClass: 'bg-blue-50 dark:bg-blue-950/20',
    borderClass: 'border-blue-400',
    textClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  4: {
    label: 'Priority 4',
    shortLabel: 'P4',
    color: '#808080',
    bgClass: 'bg-gray-50 dark:bg-gray-800/30',
    borderClass: 'border-gray-300 dark:border-gray-600',
    textClass: 'text-gray-500 dark:text-gray-400',
    dotClass: 'bg-gray-400 dark:bg-gray-500',
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  },
}

function PriorityGroupHeader({ priority, count }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[4]
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${cfg.bgClass} border-l-4 ${cfg.borderClass}`}>
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white`}
        style={{ backgroundColor: cfg.color }}
        aria-label={cfg.label}
      >
        {cfg.shortLabel}
      </span>
      <h2 className={`text-sm font-semibold ${cfg.textClass} flex-1`}>
        {cfg.label}
      </h2>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
        {count} {count === 1 ? 'task' : 'tasks'}
      </span>
    </div>
  )
}

/**
 * PriorityView — displays all incomplete tasks grouped and sorted by priority.
 * Fetches from GET /api/views/priority.
 *
 * Props:
 *   className  {string}  optional extra CSS classes for the wrapper
 */
export default function PriorityView({ className = '' }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/views/priority`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      console.error('PriorityView fetch error:', err)
      setError('Failed to load priority tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Group tasks by priority level (1–4)
  const grouped = [1, 2, 3, 4].reduce((acc, p) => {
    acc[p] = tasks.filter((t) => (t.priority ?? 4) === p)
    return acc
  }, {})

  const totalCount = tasks.length

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* View header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            Priority
          </h1>
          {!loading && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              ({totalCount} {totalCount === 1 ? 'task' : 'tasks'})
            </span>
          )}
        </div>
        <button
          onClick={fetchTasks}
          disabled={loading}
          aria-label="Refresh priority view"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading tasks">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <button
            onClick={fetchTasks}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state — all priorities empty */}
      {!loading && !error && totalCount === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">All caught up!</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">No incomplete tasks found.</p>
        </div>
      )}

      {/* Priority groups */}
      {!loading && !error && totalCount > 0 && (
        <div className="flex flex-col gap-6">
          {[1, 2, 3, 4].map((priority) => {
            const groupTasks = grouped[priority]
            if (groupTasks.length === 0) return null
            return (
              <section key={priority} aria-label={PRIORITY_CONFIG[priority].label}>
                <PriorityGroupHeader priority={priority} count={groupTasks.length} />
                <TaskList
                  tasks={groupTasks}
                  onRefresh={fetchTasks}
                  emptyMessage={`No ${PRIORITY_CONFIG[priority].label.toLowerCase()} tasks.`}
                />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
