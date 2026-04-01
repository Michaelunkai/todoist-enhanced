import { useState, useRef, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:3456'

/**
 * SearchBar — global search with / shortcut.
 * Debounces input 300ms, calls /api/search?q=, shows results in dropdown overlay.
 * Click on a result calls onNavigate({ type, item }).
 */
export default function SearchBar({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = not searched yet
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceRef = useRef(null)

  // "/" shortcut focuses the search bar
  useEffect(() => {
    function handleKeyDown(e) {
      // Only trigger when not already in an input/textarea
      const tag = e.target?.tagName?.toUpperCase()
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      if (e.key === '/' && !isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults(null)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchResults = useCallback(async (q) => {
    if (!q.trim()) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setResults({ tasks: [], projects: [], labels: [] })
      }
    } catch {
      setResults({ tasks: [], projects: [], labels: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(val), 300)
  }

  const handleFocus = () => {
    setOpen(true)
    if (query.trim() && results === null) {
      fetchResults(query)
    }
  }

  const handleResultClick = (type, item) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    onNavigate?.({ type, item })
  }

  const totalResults = results
    ? (results.tasks?.length || 0) + (results.projects?.length || 0) + (results.labels?.length || 0)
    : 0

  return (
    <div className="relative flex-1 flex justify-center">
      {/* Search input */}
      <div className="relative w-72">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none text-xs">
          {/* magnifier icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder='Search... (press /)'
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pl-8 pr-10 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 border border-transparent focus:border-gray-300 dark:focus:border-gray-600 transition-colors text-sm"
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={open && query.trim().length > 0}
          role="combobox"
        />
        {/* Shortcut hint badge */}
        {!query && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono select-none">
            /
          </span>
        )}
        {/* Clear button */}
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
            aria-label="Clear search"
            tabIndex={-1}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown results overlay */}
      {open && query.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[300] max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400 text-sm gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Searching...
            </div>
          )}

          {!loading && results && totalResults === 0 && (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results && totalResults > 0 && (
            <>
              {/* Tasks section */}
              {results.tasks?.length > 0 && (
                <section>
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tasks
                  </div>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleResultClick('task', task)}
                      className="w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                      role="option"
                    >
                      {/* Completion indicator */}
                      <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {task.title}
                        </p>
                        {(task.project_name || task.due_date) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {task.project_name && <span>{task.project_name}</span>}
                            {task.project_name && task.due_date && <span className="mx-1">&middot;</span>}
                            {task.due_date && <span>{task.due_date}</span>}
                          </p>
                        )}
                      </div>
                      {task.priority > 1 && (
                        <span className={`text-xs px-1 rounded flex-shrink-0 ${
                          task.priority === 4 ? 'text-red-600 bg-red-50 dark:bg-red-900/30' :
                          task.priority === 3 ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' :
                          'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        }`}>
                          P{5 - task.priority}
                        </span>
                      )}
                    </button>
                  ))}
                </section>
              )}

              {/* Projects section */}
              {results.projects?.length > 0 && (
                <section>
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700">
                    Projects
                  </div>
                  {results.projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleResultClick('project', project)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                      role="option"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color || '#808080' }}
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{project.name}</span>
                    </button>
                  ))}
                </section>
              )}

              {/* Labels section */}
              {results.labels?.length > 0 && (
                <section>
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700">
                    Labels
                  </div>
                  {results.labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => handleResultClick('label', label)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                      role="option"
                    >
                      <span className="text-sm" style={{ color: label.color || '#808080' }}>#</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{label.name}</span>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
