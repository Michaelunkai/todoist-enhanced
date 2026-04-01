import { useState, useEffect, useCallback } from 'react'
import TaskItem from '../components/TaskItem'

const API_BASE = 'http://localhost:3456'

/**
 * LabelsView — shows all labels as clickable pills at the top.
 * Supports multi-label filtering: tasks matching ALL selected labels are shown.
 *
 * Props:
 *   token  {string}  auth token
 */
export default function LabelsView({ token }) {
  const [labels, setLabels] = useState([])
  const [selectedLabelIds, setSelectedLabelIds] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all labels
  const fetchLabels = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/labels`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Labels fetch failed: ${res.status}`)
      const data = await res.json()
      setLabels(data.labels || [])
    } catch (err) {
      console.error('LabelsView fetchLabels:', err)
      setError('Failed to load labels.')
    }
  }, [token])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  // Fetch tasks filtered by selected labels.
  // Strategy: fetch tasks for each selected label, then intersect (AND semantics).
  const fetchTasks = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (selectedLabelIds.length === 0) {
        // No filter active — fetch all tasks
        const res = await fetch(`${API_BASE}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`)
        const data = await res.json()
        setTasks(data.tasks || [])
      } else {
        // Fetch tasks for each selected label in parallel, then intersect
        const results = await Promise.all(
          selectedLabelIds.map(async (labelId) => {
            const res = await fetch(
              `${API_BASE}/api/tasks?label_id=${encodeURIComponent(labelId)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!res.ok) throw new Error(`Tasks fetch failed for label ${labelId}`)
            const data = await res.json()
            return data.tasks || []
          })
        )
        // Intersect: keep tasks that appear in ALL result sets
        if (results.length === 1) {
          setTasks(results[0])
        } else {
          const firstIds = new Set(results[0].map((t) => t.id))
          let intersected = results[0]
          for (let i = 1; i < results.length; i++) {
            const currentIds = new Set(results[i].map((t) => t.id))
            intersected = intersected.filter((t) => currentIds.has(t.id))
          }
          setTasks(intersected)
        }
      }
    } catch (err) {
      console.error('LabelsView fetchTasks:', err)
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [token, selectedLabelIds])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const toggleLabel = (labelId) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    )
  }

  const clearFilters = () => setSelectedLabelIds([])

  const handleToggleComplete = async (task) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !task.completed }),
      })
      if (res.ok) fetchTasks()
    } catch (err) {
      console.error('LabelsView toggleComplete:', err)
    }
  }

  const handleDeleted = async (taskId) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchTasks()
    } catch (err) {
      console.error('LabelsView handleDeleted:', err)
    }
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Labels
        </h1>

        {/* Label pills */}
        {labels.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No labels yet. Create labels to organize your tasks.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {labels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.id)
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  aria-pressed={isSelected}
                  aria-label={`Filter by label: ${label.name}`}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all duration-150',
                    'border focus:outline-none focus:ring-2 focus:ring-offset-1',
                    isSelected
                      ? 'text-white border-transparent shadow-md scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
                  ].join(' ')}
                  style={
                    isSelected
                      ? { backgroundColor: label.color || '#6366f1', borderColor: label.color || '#6366f1' }
                      : {}
                  }
                >
                  {/* Color dot (shown when not selected) */}
                  {!isSelected && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color || '#6366f1' }}
                      aria-hidden="true"
                    />
                  )}
                  {label.name}
                  {label.task_count != null && (
                    <span
                      className={[
                        'text-xs px-1.5 py-0.5 rounded-full',
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                      ].join(' ')}
                    >
                      {label.task_count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Clear filter button */}
            {selectedLabelIds.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                aria-label="Clear all label filters"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Active filter summary */}
        {selectedLabelIds.length > 0 && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Showing tasks with{' '}
            <span className="font-medium">
              {selectedLabelIds.length === 1 ? 'label' : 'all labels'}
            </span>
            :{' '}
            {selectedLabelIds
              .map((id) => labels.find((l) => l.id === id)?.name)
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-red-500 rounded-full animate-spin"
              aria-label="Loading tasks"
            />
          </div>
        ) : (
          <>
            {/* Active tasks */}
            {activeTasks.length > 0 && (
              <section aria-label="Active tasks">
                <div
                  role="list"
                  aria-label="Active tasks"
                  className="space-y-0.5"
                >
                  {activeTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDeleted={handleDeleted}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <section aria-label="Completed tasks" className="mt-6">
                <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Completed ({completedTasks.length})
                </h2>
                <div role="list" className="space-y-0.5">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDeleted={handleDeleted}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {tasks.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {selectedLabelIds.length > 0
                    ? 'No tasks match the selected labels.'
                    : 'No tasks found.'}
                </p>
                {selectedLabelIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 text-sm text-red-500 hover:text-red-600 underline focus:outline-none"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
