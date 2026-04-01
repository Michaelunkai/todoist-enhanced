import { useState } from 'react'

const API_BASE = 'http://localhost:3456'

// 21 Todoist colors with names and hex values
const TODOIST_COLORS = [
  { name: 'Berry Red',    hex: '#b8256f' },
  { name: 'Red',          hex: '#db4035' },
  { name: 'Orange',       hex: '#ff9933' },
  { name: 'Yellow',       hex: '#fad000' },
  { name: 'Olive Green',  hex: '#afb83b' },
  { name: 'Lime Green',   hex: '#7ecc49' },
  { name: 'Green',        hex: '#299438' },
  { name: 'Mint Green',   hex: '#6accbc' },
  { name: 'Teal',         hex: '#158fad' },
  { name: 'Sky Blue',     hex: '#14aaf5' },
  { name: 'Light Blue',   hex: '#96c3eb' },
  { name: 'Blue',         hex: '#4073ff' },
  { name: 'Grape',        hex: '#884dff' },
  { name: 'Violet',       hex: '#af38eb' },
  { name: 'Lavender',     hex: '#eb96eb' },
  { name: 'Magenta',      hex: '#e05194' },
  { name: 'Salmon',       hex: '#ff8d85' },
  { name: 'Charcoal',     hex: '#808080' },
  { name: 'Grey',         hex: '#b8b8b8' },
  { name: 'Taupe',        hex: '#ccac93' },
  { name: 'Indigo',       hex: '#6366f1' },
]

export default function CreateProjectDialog({ token, onProjectCreated, onClose }) {
  const [name, setName]           = useState('')
  const [color, setColor]         = useState('#6366f1')
  const [isFavorite, setIsFavorite] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), color, isFavorite }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create project.')
        setLoading(false)
        return
      }
      onProjectCreated(data.project)
      onClose()
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const selectedColorName = TODOIST_COLORS.find((c) => c.hex === color)?.name || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create project dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add project
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              maxLength={120}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
              {selectedColorName && (
                <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                  — {selectedColorName}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {TODOIST_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={`Color: ${c.name}`}
                  aria-pressed={color === c.hex}
                  onClick={() => setColor(c.hex)}
                  className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 rounded-full"
                  style={{ padding: 2 }}
                >
                  <span
                    className="block rounded-full transition-transform"
                    style={{
                      width: 22,
                      height: 22,
                      backgroundColor: c.hex,
                      boxShadow:
                        color === c.hex
                          ? `0 0 0 2px white, 0 0 0 4px ${c.hex}`
                          : 'none',
                      transform: color === c.hex ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Favorite toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isFavorite}
              onClick={() => setIsFavorite((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isFavorite ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  isFavorite ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Add to favorites
            </span>
            {isFavorite && (
              <svg
                className="w-4 h-4 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
              </svg>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
