/**
 * RecurringPicker — dropdown for selecting task recurrence pattern.
 *
 * Props:
 *   value     {string|null}  current recurring value ("daily"|"weekly"|"monthly"|"custom:<expr>"|null)
 *   onChange  {fn}           (newValue: string|null) => void
 *   dueDate   {string}       current due_date value (YYYY-MM-DD), used to compute next due date
 */

const RECURRENCE_OPTIONS = [
  { value: '', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom…' },
]

/**
 * Compute the next due date string (YYYY-MM-DD) from a base date and a
 * recurrence pattern. Returns null if it cannot be determined.
 */
function computeNextDue(pattern, baseDateStr) {
  if (!pattern || !baseDateStr) return null

  // For custom patterns like "custom:every 2 weeks" we only show the raw expression
  if (pattern.startsWith('custom:')) return null

  const base = new Date(baseDateStr + 'T00:00:00')
  if (isNaN(base.getTime())) return null

  const next = new Date(base)
  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    default:
      return null
  }

  // Format as YYYY-MM-DD
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function RecurringPicker({ value, onChange, dueDate }) {
  // Determine if the stored value is one of the preset options or custom
  const isCustom = value && !['daily', 'weekly', 'monthly'].includes(value)
  const selectValue = isCustom ? 'custom' : (value || '')

  // Extract the custom expression (strip "custom:" prefix if present)
  const customExpr = isCustom
    ? (value.startsWith('custom:') ? value.slice(7) : value)
    : ''

  const handleSelectChange = (e) => {
    const chosen = e.target.value
    if (chosen === '') {
      onChange(null)
    } else if (chosen === 'custom') {
      // When switching to custom, seed with current customExpr or empty string
      onChange(customExpr ? `custom:${customExpr}` : 'custom:')
    } else {
      onChange(chosen)
    }
  }

  const handleCustomInput = (e) => {
    const expr = e.target.value
    onChange(expr ? `custom:${expr}` : 'custom:')
  }

  const nextDue = computeNextDue(value, dueDate)

  return (
    <div className="flex flex-col gap-2">
      {/* Recurrence dropdown */}
      <div className="flex items-center gap-2">
        {/* Recurring icon ↻ */}
        <span
          className={[
            'text-base select-none flex-shrink-0 transition-colors',
            value ? 'text-green-500' : 'text-gray-400 dark:text-gray-500',
          ].join(' ')}
          aria-hidden="true"
          title="Recurrence"
        >
          ↻
        </span>

        <select
          value={selectValue}
          onChange={handleSelectChange}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          aria-label="Recurrence pattern"
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom expression input — only shown when "Custom…" is selected */}
      {selectValue === 'custom' && (
        <input
          type="text"
          value={customExpr}
          onChange={handleCustomInput}
          placeholder="e.g. every 2 weeks, every 3 days…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          aria-label="Custom recurrence expression"
        />
      )}

      {/* Next due date display */}
      {value && nextDue && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Next due: <span className="font-medium text-gray-700 dark:text-gray-300">{nextDue}</span>
        </p>
      )}

      {/* For custom expressions that can't auto-compute next due */}
      {value && value.startsWith('custom:') && value.slice(7) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pattern: <span className="font-medium text-gray-700 dark:text-gray-300 italic">{value.slice(7)}</span>
        </p>
      )}
    </div>
  )
}
