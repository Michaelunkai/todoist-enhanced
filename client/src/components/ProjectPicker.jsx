import { useState, useRef, useEffect } from 'react'

/**
 * ProjectPicker â€" standalone dropdown for selecting a project or section.
 * Self-fetches projects + sections from GET /api/projects on mount.
 *
 * Props:
 *   value       {string} selected project id or section id ('' = no project)
 *   selectedId  {string} alias for value â€" id of the currently selected project/section
 *   onChange    {fn}     called with { projectId, sectionId } â€" sectionId may be null
 *   placeholder {string} label when nothing selected (default "No project")
 *   apiBase     {string} base URL for API (default '')
 */
export default function ProjectPicker({
  value = '',
  selectedId,
  onChange,
  placeholder = 'No project',
  apiBase = '',
}) {
  // selectedId prop takes precedence over value if provided
  if (selectedId !== undefined) value = selectedId

  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [sectionsMap, setSectionsMap] = useState({}) // projectId â†' Section[]
  const [loading, setLoading] = useState(true)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)

  // â"€â"€ Fetch projects + their sections on mount â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}/api/projects`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch projects')
        const { projects: fetchedProjects } = await res.json()
        if (cancelled) return

        setProjects(fetchedProjects || [])

        // Fetch sections for all projects in parallel
        const sectionResults = await Promise.all(
          (fetchedProjects || []).map(async (project) => {
            try {
              const sRes = await fetch(
                `${apiBase}/api/projects/${project.id}/sections`,
                { credentials: 'include' }
              )
              if (!sRes.ok) return { projectId: project.id, sections: [] }
              const { sections } = await sRes.json()
              return { projectId: project.id, sections: sections || [] }
            } catch {
              return { projectId: project.id, sections: [] }
            }
          })
        )

        if (cancelled) return

        const map = {}
        for (const { projectId, sections } of sectionResults) {
          map[projectId] = sections
        }
        setSectionsMap(map)
      } catch (err) {
        console.error('ProjectPicker: failed to load projects', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [apiBase])

  // â"€â"€ Close on outside click â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  // â"€â"€ Reset highlight when dropdown closes â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (!open) setHighlightedIndex(-1)
  }, [open])

  // â"€â"€ Keyboard navigation: ArrowDown/Up move highlight, Enter selects, Escape closes â"€â"€
  useEffect(() => {
    function buildFlatItems() {
      const items = [{ type: 'none' }]
      for (const project of projects) {
        items.push({ type: 'project', project })
        const sections = sectionsMap[project.id] || []
        for (const section of sections) {
          items.push({ type: 'section', project, section })
        }
      }
      return items
    }

    function handleKeyDown(e) {
      if (!open) return
      const flatItems = buildFlatItems()
      const total = flatItems.length

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % total)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + total) % total)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < total) {
          const item = flatItems[highlightedIndex]
          if (item.type === 'none') {
            onChange && onChange({ projectId: '', sectionId: null })
          } else if (item.type === 'project') {
            onChange && onChange({ projectId: String(item.project.id), sectionId: null })
          } else if (item.type === 'section') {
            onChange && onChange({ projectId: String(item.project.id), sectionId: String(item.section.id) })
          }
          setOpen(false)
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, highlightedIndex, projects, sectionsMap, onChange])

  // â"€â"€ Derive display label and color from current value â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  function getDisplayInfo() {
    if (!value) return { label: placeholder, color: null }
    for (const project of projects) {
      if (String(project.id) === String(value)) {
        return { label: project.name, color: project.color }
      }
      const sections = sectionsMap[project.id] || []
      for (const section of sections) {
        if (String(section.id) === String(value)) {
          return { label: `${project.name} / ${section.name}`, color: project.color }
        }
      }
    }
    return { label: placeholder, color: null }
  }

  function handleSelectProject(projectId) {
    onChange && onChange({ projectId: String(projectId), sectionId: null })
    setOpen(false)
  }

  function handleSelectSection(projectId, sectionId) {
    onChange && onChange({ projectId: String(projectId), sectionId: String(sectionId) })
    setOpen(false)
  }

  function handleSelectNone() {
    onChange && onChange({ projectId: '', sectionId: null })
    setOpen(false)
  }

  const { label, color: selectedColor } = getDisplayInfo()

  return (
    <div ref={containerRef} className="relative inline-block text-left w-full">
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
          {selectedColor ? (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
          )}
          <span className="truncate">{loading ? 'Loading\u2026' : label}</span>
        </span>
        {/* Chevron icon â€" rotates when open */}
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
        <ul
          role="listbox"
          aria-label="Select project or section"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 focus:outline-none"
        >
          {/* No-project option (flat index 0) */}
          <li
            role="option"
            aria-selected={value === ''}
            onClick={handleSelectNone}
            onMouseEnter={() => setHighlightedIndex(0)}
            className={[
              'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm select-none',
              highlightedIndex === 0
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium'
                : value === ''
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ].join(' ')}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <span className="truncate flex-1">{placeholder}</span>
            {value === '' && (
              <svg
                className="w-4 h-4 ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </li>

          {(() => {
            // Build flat index counter starting at 1 (0 = no-project option above)
            let flatIdx = 1
            return projects.map((project) => {
              const isProjectSelected = String(project.id) === String(value)
              const sections = sectionsMap[project.id] || []
              const projectFlatIdx = flatIdx++

              return (
                <li key={project.id} role="none">
                  {/* Project row â€" top-level */}
                  <div
                    role="option"
                    aria-selected={isProjectSelected}
                    onClick={() => handleSelectProject(project.id)}
                    onMouseEnter={() => setHighlightedIndex(projectFlatIdx)}
                    className={[
                      'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm select-none',
                      highlightedIndex === projectFlatIdx
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium'
                        : isProjectSelected
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#6b7280' }}
                    />
                    <span className="truncate font-medium">{project.name}</span>
                    {isProjectSelected && (
                      <svg
                        className="w-4 h-4 ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Section rows â€" indented under parent project */}
                  {sections.map((section) => {
                    const isSectionSelected = String(section.id) === String(value)
                    const sectionFlatIdx = flatIdx++
                    return (
                      <div
                        key={section.id}
                        role="option"
                        aria-selected={isSectionSelected}
                        onClick={() => handleSelectSection(project.id, section.id)}
                        onMouseEnter={() => setHighlightedIndex(sectionFlatIdx)}
                        style={{ paddingLeft: '1.5rem' }}
                        className={[
                          'flex items-center gap-2 pr-3 py-1.5 cursor-pointer text-sm select-none',
                          highlightedIndex === sectionFlatIdx
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium'
                            : isSectionSelected
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                        ].join(' ')}
                      >
                        {/* Section icon â€" lines indicating a section */}
                        <svg
                          className="w-3 h-3 flex-shrink-0 opacity-60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="truncate">{section.name}</span>
                        {isSectionSelected && (
                          <svg
                            className="w-4 h-4 ml-auto flex-shrink-0 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )
                  })}
                </li>
              )
            })
          })()}
        </ul>
      )}
    </div>
  )
}
