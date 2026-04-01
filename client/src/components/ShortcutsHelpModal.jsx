import { useEffect } from 'react'

const SHORTCUTS = [
  { key: 'Ctrl + K', action: 'Focus search bar' },
  { key: 'Q', action: 'Add task in current view' },
  { key: 'Ctrl + Q', action: 'Quick add task' },
  { key: 'g  then  h', action: 'Go to Home' },
  { key: 'g  then  i', action: 'Go to Inbox' },
  { key: 'g  then  t', action: 'Go to Today' },
  { key: 'g  then  u', action: 'Go to Upcoming' },
  { key: '?', action: 'Show keyboard shortcuts' },
  { key: 'Escape', action: 'Close modal / panel' },
  { key: 'Delete', action: 'Delete selected task' },
  { key: 'Ctrl + Shift + F', action: 'Toggle Focus Mode' },
]

export default function ShortcutsHelpModal({ isOpen, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcuts table */}
        <table className="w-full text-sm" aria-label="Keyboard shortcuts list">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th
                scope="col"
                className="pb-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-2/5"
              >
                Key
              </th>
              <th
                scope="col"
                className="pb-2 text-left font-semibold text-gray-500 dark:text-gray-400"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ key, action }) => (
              <tr
                key={key}
                className="border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <td className="py-2.5 pr-4">
                  <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-xs border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                    {key}
                  </kbd>
                </td>
                <td className="py-2.5 text-gray-700 dark:text-gray-300">
                  {action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer hint */}
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-mono text-xs">Esc</kbd> or click outside to close
        </p>
      </div>
    </div>
  )
}
