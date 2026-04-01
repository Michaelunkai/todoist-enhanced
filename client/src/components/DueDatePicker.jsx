import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * DueDatePicker — calendar widget with natural language shortcuts.
 *
 * Props:
 *   value     {string}  ISO date string (YYYY-MM-DD) or ''
 *   onChange  {fn}      (isoDateString: string) => void  — called on every selection
 *   onClose   {fn}      optional callback when picker should close (Escape / outside click)
 *   className {string}  optional extra classes for the outer wrapper
 *
 * Natural language shortcuts: today, tomorrow, next friday, next week.
 * Outputs ISO date string (YYYY-MM-DD) on selection.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Format a Date → 'YYYY-MM-DD' */
function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse an ISO string → local Date (no UTC shift). Returns null on bad input. */
function fromISO(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Return today at midnight (local time). */
function today() {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Day names (Mon-first for calendar grid) */
const DAY_NAMES_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Build a 6×7 grid of Date objects for a given year/month (0-indexed month).
 * First column = Monday.
 */
function buildCalendarDays(year, month) {
  const first = new Date(year, month, 1)
  // getDay() returns 0=Sun … 6=Sat; convert to Mon-first (0=Mon … 6=Sun)
  const startOffset = (first.getDay() + 6) % 7
  const days = []
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    days.push(new Date(year, month, 1 + i))
  }
  return days
}

/** Natural-language shortcut definitions */
function buildShortcuts() {
  const t = today()

  const tomorrow = new Date(t)
  tomorrow.setDate(t.getDate() + 1)

  // Next Friday
  const dow = t.getDay() // 0=Sun, 5=Fri
  const daysUntilFri = ((5 - dow) + 7) % 7 || 7 // if today is Fri, push to next Fri
  const nextFriday = new Date(t)
  nextFriday.setDate(t.getDate() + daysUntilFri)

  // Next Monday (start of next week)
  const daysUntilMon = ((1 - dow) + 7) % 7 || 7
  const nextWeek = new Date(t)
  nextWeek.setDate(t.getDate() + daysUntilMon)

  return [
    { label: 'Today',       sublabel: formatWeekday(t),           date: t },
    { label: 'Tomorrow',    sublabel: formatWeekday(tomorrow),     date: tomorrow },
    { label: 'Next Friday', sublabel: formatWeekday(nextFriday),   date: nextFriday },
    { label: 'Next Week',   sublabel: formatWeekday(nextWeek),     date: nextWeek },
  ]
}

function formatWeekday(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── DueDatePicker ────────────────────────────────────────────────────────────

export default function DueDatePicker({ value = '', onChange, onClose, className = '' }) {
  const selectedDate = fromISO(value)
  const t = today()

  // Calendar view state — start on month of selected date, or current month
  const initDate = selectedDate || t
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())

  // Re-sync view when the external value changes (e.g. controlled reset)
  useEffect(() => {
    const d = fromISO(value)
    if (d) {
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!onClose) return
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    if (!onClose) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSelectDate = useCallback((date) => {
    onChange && onChange(toISO(date))
    onClose && onClose()
  }, [onChange, onClose])

  const handleClear = useCallback((e) => {
    e.stopPropagation()
    onChange && onChange('')
  }, [onChange])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const calendarDays = buildCalendarDays(viewYear, viewMonth)
  const shortcuts = buildShortcuts()

  const todayISO = toISO(t)

  return (
    <div
      ref={containerRef}
      className={[
        'inline-flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700',
        'shadow-xl overflow-hidden select-none w-72',
        className,
      ].join(' ')}
      role="dialog"
      aria-label="Due date picker"
    >
      {/* ── Quick shortcuts ─────────────────────────────────────── */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-800">
        <p className="px-1 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Quick select
        </p>
        <div className="grid grid-cols-2 gap-1">
          {shortcuts.map((s) => {
            const iso = toISO(s.date)
            const isSelected = value === iso
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => handleSelectDate(s.date)}
                aria-pressed={isSelected}
                className={[
                  'flex items-start gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
                ].join(' ')}
              >
                <CalendarIcon />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{s.label}</span>
                  <span className={['text-xs', isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'].join(' ')}>
                    {s.sublabel}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Calendar header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* ── Day-of-week header ──────────────────────────────────── */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {DAY_NAMES_SHORT.map((d) => (
          <span key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-0.5">
            {d}
          </span>
        ))}
      </div>

      {/* ── Calendar days grid ──────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-2">
        {calendarDays.map((date, idx) => {
          const iso = toISO(date)
          const isCurrentMonth = date.getMonth() === viewMonth
          const isToday = iso === todayISO
          const isSelected = value === iso
          const isPast = date < t && !isToday

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(date)}
              aria-label={date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              aria-pressed={isSelected}
              disabled={!isCurrentMonth && isPast}
              className={[
                'relative flex items-center justify-center w-8 h-8 mx-auto rounded-full text-xs font-medium',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isToday
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold'
                  : !isCurrentMonth
                  ? 'text-gray-300 dark:text-gray-700'
                  : isPast
                  ? 'text-gray-400 dark:text-gray-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {date.getDate()}
              {/* Today dot indicator (only when not selected) */}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Footer: clear / no date ─────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {value ? `Selected: ${value}` : 'No date set'}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1 py-0.5 transition-colors"
            aria-label="Clear due date"
          >
            <XIcon />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DueDatePickerTrigger ─────────────────────────────────────────────────────
/**
 * Convenience wrapper: renders a trigger button + floating DueDatePicker panel.
 *
 * Props (same as DueDatePicker + triggerClassName):
 *   value           {string}  ISO date or ''
 *   onChange        {fn}      (isoDate: string) => void
 *   triggerClassName {string} extra classes for the trigger button
 *   placeholder     {string}  text shown when no date is selected
 */
export function DueDatePickerTrigger({
  value = '',
  onChange,
  triggerClassName = '',
  placeholder = 'Set due date',
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const displayLabel = value ? value : placeholder

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          value
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700',
          triggerClassName,
        ].join(' ')}
      >
        <CalendarIcon />
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50">
          <DueDatePicker
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
