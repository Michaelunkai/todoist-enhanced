import { useState, useEffect, useRef } from 'react'

/**
 * LabelSelector - multi-select checkbox list of all labels with color indicators.
 * Self-fetches labels from GET /api/labels on mount.
 *
 * Props:
 *   selectedIds  {string[]}  array of currently selected label IDs (default [])
 *   onChange     {fn}        called with array of selected label IDs on change
 *   placeholder  {string}    trigger button label when nothing selected (default "Labels")
 *   apiBase      {string}    base URL for API (default '')
 *   className    {string}    extra classes for the container
 */
export default function LabelSelector({
  selectedIds = [],
  onChange,
  placeholder = 'Labels',
  apiBase = '',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  // Fetch all labels on mount
  useEffect(() => {
    let cancelled = false

    async function loadLabels() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${apiBase}/api/labels`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch labels')
        const { labels: fetched } = await res.json()
        if (!cancelled) {
          setLabels(fetched || [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('LabelSelector: failed to load labels', err)
          setError('Failed to load labels')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLabels()
    return () => { cancelled = true }
  }, [apiBase])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function handleToggle(labelId) {
    const id = String(labelId)
    const current = selectedIds.map(String)
    let next
    if (current.includes(id)) {
      next = current.filter((x) => x !== id)
    } else {
      next = [...current, id]
    }
    onChange && onChange(next)
  }

  function handleClearAll() {
    onChange && onChange([])
  }

  // Build display summary for trigger button
  function getButtonLabel() {
    if (loading) return 'Loading\u2026'
    if (selectedIds.length === 0) return placeholder
    if (selectedIds.length === 1) {
      const match = labels.find((l) => String(l.id) === String(selectedIds[0]))
      return match ? match.name : placeholder
    }
    return `${selectedIds.length} labels`
  }

  // Get color of first selected label for the trigger dot
  function getTriggerColor() {
    if (selectedIds.length === 0) return null
    const match = labels.find((l) => String(l.id) === String(selectedIds[0]))
    return match ? match.color : null
  }

  const triggerColor = getTriggerColor()
  const hasSelection = selectedIds.length > 0

  return (
    <div ref={containerRef} className={`relative inline-block text-left w-full ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        className="flex items-center justify-between w-full gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          {/* Color dot: show first selected label color or neutral gray */}
          {triggerColor ? (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: triggerColor }}
            />
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
          )}
          <span className="truncate">{getButtonLabel()}</span>
          {/* Badge showing count when multiple selected */}
          {selectedIds.length > 1 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold flex-shrink-0">
              {selectedIds.length}
            </span>
          )}
        </span>

        {/* Chevron icon rotates when open */}
        <svg
          className={[
            'w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-150',
            open ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && !loading && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Select labels"
          className="absolute z-50 mt-1 w-full min-w-[180px] max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 focus:outline-none"
        >
          {/* Error state */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!error && labels.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
              No labels found
            </div>
          )}

          {/* Clear all row — only shown when labels are selected */}
          {!error && labels.length > 0 && hasSelection && (
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 select-none"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear all</span>
            </button>
          )}

          {/* Divider after clear-all */}
          {!error && labels.length > 0 && hasSelection && (
            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
          )}

          {/* Label list */}
          {!error && labels.map((label) => {
            const isChecked = selectedIds.map(String).includes(String(label.id))
            return (
              <label
                key={label.id}
                role="option"
                aria-selected={isChecked}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm select-none transition-colors',
                  isChecked
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(label.id)}
                  className="sr-only"
                  aria-label={label.name}
                />
                {/* Custom checkbox visual */}
                <span
                  className={[
                    'inline-flex items-center justify-center w-4 h-4 rounded border-2 flex-shrink-0 transition-colors',
                    isChecked
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400 dark:border-gray-500 bg-transparent',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isChecked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>

                {/* Color indicator dot */}
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color || '#6b7280' }}
                  aria-hidden="true"
                />

                {/* Label name */}
                <span className="truncate flex-1">{label.name}</span>

                {/* Task count badge */}
                {label.task_count !== undefined && label.task_count > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {label.task_count}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
