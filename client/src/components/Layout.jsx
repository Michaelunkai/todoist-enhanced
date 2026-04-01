import { useState, useEffect, useCallback } from 'react'

/**
 * Layout — responsive three-column grid
 *
 * Breakpoints:
 *   mobile  (< 768px)   — sidebar hidden by default, hamburger opens it as overlay
 *   tablet  (768–1023px) — sidebar overlays content when open
 *   desktop (≥ 1024px)  — sidebar always visible, no overlay
 *
 * ┌──────────────┬────────────────────┬──────────────────────┐
 * │  Sidebar     │    TaskView        │  TaskDetailPanel     │
 * │  (260px)     │    (flex-1)        │  (350px, opt.)       │
 * └──────────────┴────────────────────┴──────────────────────┘
 *
 * Props:
 *   sidebar        — ReactNode  — left sidebar content
 *   children       — ReactNode  — center task-list content
 *   detailPanel    — ReactNode  — right detail panel content (optional)
 *   showDetail     — boolean    — controls whether the right panel is visible
 *   onCloseDetail  — function   — called when the detail panel close button is clicked
 */
export default function Layout({
  sidebar,
  children,
  detailPanel,
  showDetail = false,
  onCloseDetail,
}) {
  // sidebarOpen drives mobile/tablet overlay; desktop ignores it (always visible via CSS)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeSidebar() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeSidebar])

  return (
    <div className="flex h-screen overflow-hidden relative">

      {/* ── Backdrop (mobile / tablet only) ────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {/*
          Desktop (lg+):  always visible, static in flow (no z / no translate)
          Tablet (md):    overlay (fixed, z-30), slides in from left
          Mobile (< md):  overlay (fixed, z-30), slides in from left
      */}
      <aside
        className={[
          // Base styles — Todoist sidebar dark #282828
          'flex flex-col h-full text-gray-100 overflow-y-auto',
          'w-[260px] shrink-0',
          // Desktop: static in flow, always visible
          'lg:static lg:translate-x-0 lg:z-auto',
          // Tablet + mobile: fixed overlay, toggled via translate
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-30',
          'max-lg:transition-transform max-lg:duration-300 max-lg:ease-in-out',
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        ].join(' ')}
        style={{ backgroundColor: '#282828' }}
        aria-label="Sidebar navigation"
      >
        {/* Close button inside sidebar (mobile / tablet) */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700 lg:hidden">
          <span className="text-sm font-medium text-gray-300">Menu</span>
          <button
            onClick={closeSidebar}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sidebar}
      </aside>

      {/* ── TaskView (center, flex-1) ────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col h-full overflow-y-auto min-w-0"
        style={{ backgroundColor: '#FAFAFA', color: '#202020' }}
        aria-label="Task view"
      >
        {/* ── Top bar: hamburger button (mobile / tablet) ─────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
          >
            {/* Hamburger icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Todoist Enhanced</span>
        </div>

        {children}
      </main>

      {/* ── TaskDetailPanel (right, 350 px, hidden by default) ─────────── */}
      {showDetail && (
        <aside
          className={[
            'shrink-0 flex flex-col h-full border-l border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-900 overflow-y-auto',
            // Mobile: full-width overlay; Tablet: 350px; Desktop: 350px inline
            'w-full sm:w-[350px]',
            // On mobile / tablet make it an overlay so it doesn't crush the center
            'max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-xl',
            'lg:static lg:w-[350px]',
          ].join(' ')}
          aria-label="Task detail panel"
        >
          {/* Close button */}
          {onCloseDetail && (
            <div className="flex justify-end p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onCloseDetail}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                aria-label="Close detail panel"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          {detailPanel}
        </aside>
      )}
    </div>
  )
}
