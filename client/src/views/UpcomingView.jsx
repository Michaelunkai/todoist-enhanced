import { useState, useEffect, useCallback } from 'react'
import TaskList from '../components/TaskList'

const API_BASE = 'http://localhost:3456'

const BUCKET_ORDER = ['today', 'tomorrow', 'this_week', 'next_week', 'later']

const BUCKET_LABELS = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  next_week: 'Next Week',
  later: 'Later',
}

const BUCKET_COLORS = {
  today: 'text-red-600 dark:text-red-400',
  tomorrow: 'text-orange-500 dark:text-orange-400',
  this_week: 'text-blue-600 dark:text-blue-400',
  next_week: 'text-purple-600 dark:text-purple-400',
  later: 'text-gray-500 dark:text-gray-400',
}

/**
 * UpcomingView — displays all incomplete tasks grouped into date-range buckets:
 *   Today, Tomorrow, This Week, Next Week, Later
 *
 * Fetches from GET /api/views/upcoming which returns tasks with a `bucket` field.
 */
export default function UpcomingView() {
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUpcoming = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/views/upcoming`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = await res.json()
      // Group tasks by bucket
      const groups = {}
      for (const bucket of BUCKET_ORDER) {
        groups[bucket] = []
      }
      for (const task of data.tasks || []) {
        const b = task.bucket || 'later'
        if (!groups[b]) groups[b] = []
        groups[b].push(task)
      }
      setGrouped(groups)
    } catch (err) {
      console.error('UpcomingView fetch error:', err)
      setError(err.message || 'Failed to load upcoming tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUpcoming()
  }, [fetchUpcoming])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">
        Loading upcoming tasks...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={fetchUpcoming}
          className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upcoming</h1>
        {totalCount > 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {totalCount} task{totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">&#x1F4C5;</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming tasks. Enjoy the clear schedule!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {BUCKET_ORDER.map((bucket) => {
            const tasks = grouped[bucket] || []
            if (tasks.length === 0) return null
            return (
              <section key={bucket} aria-labelledby={`bucket-heading-${bucket}`}>
                {/* Date bucket header */}
                <div className="flex items-center gap-3 mb-3">
                  <h2
                    id={`bucket-heading-${bucket}`}
                    className={`text-sm font-semibold uppercase tracking-wider ${BUCKET_COLORS[bucket]}`}
                  >
                    {BUCKET_LABELS[bucket]}
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-600 font-medium bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                    {tasks.length}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                <TaskList
                  tasks={tasks}
                  onRefresh={fetchUpcoming}
                  emptyMessage=""
                />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
