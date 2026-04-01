/**
 * PrioritySelector — P1/P2/P3/P4 radio buttons with Todoist colors.
 *
 * Props:
 *   value     {number}  currently selected priority (1-4), default 4
 *   onChange  {fn}      (priority: number) => void
 *   className {string}  optional extra classes for the wrapper
 */

const PRIORITIES = [
  { value: 1, label: 'P1', color: '#DB4035', title: 'Priority 1 — Urgent' },
  { value: 2, label: 'P2', color: '#FF9933', title: 'Priority 2 — High' },
  { value: 3, label: 'P3', color: '#4073FF', title: 'Priority 3 — Medium' },
  { value: 4, label: 'P4', color: '#808080', title: 'Priority 4 — Normal' },
]

function FlagIcon({ color, filled }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Flag pole */}
      <line x1="2" y1="1" x2="2" y2="13" />
      {/* Flag shape */}
      <path d="M2 1 L12 4 L2 8 Z" />
    </svg>
  )
}

export default function PrioritySelector({ value = 4, onChange, className = '' }) {
  const handleSelect = (priority) => {
    if (onChange) onChange(priority)
  }

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="radiogroup"
      aria-label="Task priority"
    >
      {PRIORITIES.map((p) => {
        const isSelected = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={p.title}
            title={p.title}
            onClick={() => handleSelect(p.value)}
            style={{
              borderColor: isSelected ? p.color : 'transparent',
              backgroundColor: isSelected ? `${p.color}1A` : 'transparent',
            }}
            className={[
              'flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium',
              'transition-all duration-150 cursor-pointer select-none',
              'hover:border-current focus:outline-none focus:ring-2 focus:ring-offset-1',
            ].join(' ')}
          >
            <FlagIcon color={p.color} filled={isSelected} />
            <span style={{ color: p.color }}>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}
