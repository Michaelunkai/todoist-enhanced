/**
 * EmptyState — displays a friendly illustration + message when a view has no content.
 *
 * Props:
 *   type  {string}  One of: 'inbox' | 'today' | 'upcoming' | 'projects'
 *
 * Usage:
 *   <EmptyState type="inbox" />
 *   <EmptyState type="today" />
 *   <EmptyState type="upcoming" />
 *   <EmptyState type="projects" />
 */

const CONFIGS = {
  inbox: {
    title: "You're all caught up!",
    subtitle:
      'Your inbox is empty. Tasks added without a project will appear here.',
    color: 'text-indigo-300 dark:text-indigo-800',
    illustration: (
      <svg
        viewBox="0 0 120 120"
        fill="currentColor"
        aria-hidden="true"
        className="w-32 h-32"
      >
        {/* tray body */}
        <rect x="15" y="62" width="90" height="38" rx="9" opacity="0.55" />
        {/* tray slot arc */}
        <path
          d="M15 62 Q20 82 38 82 L82 82 Q100 82 105 62 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.35"
        />
        {/* check circle */}
        <circle cx="60" cy="34" r="22" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
        <path
          d="M50 34 l7 7 13-13"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* sparkles */}
        <circle cx="20" cy="26" r="3" opacity="0.3" />
        <circle cx="100" cy="30" r="2.5" opacity="0.25" />
        <circle cx="90" cy="16" r="2" opacity="0.2" />
        <circle cx="30" cy="18" r="1.5" opacity="0.2" />
      </svg>
    ),
  },

  today: {
    title: 'Enjoy your day!',
    subtitle: "No tasks due today. Take a breather or plan tomorrow's work.",
    color: 'text-amber-300 dark:text-amber-800',
    illustration: (
      <svg
        viewBox="0 0 120 120"
        fill="currentColor"
        aria-hidden="true"
        className="w-32 h-32"
      >
        {/* sun core */}
        <circle cx="60" cy="60" r="20" opacity="0.7" />
        {/* sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 60 + Math.cos(rad) * 26
          const y1 = 60 + Math.sin(rad) * 26
          const x2 = 60 + Math.cos(rad) * 36
          const y2 = 60 + Math.sin(rad) * 36
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          )
        })}
        {/* smile */}
        <path
          d="M52 63 Q60 72 68 63"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* eyes */}
        <circle cx="54" cy="57" r="2" opacity="0.7" />
        <circle cx="66" cy="57" r="2" opacity="0.7" />
      </svg>
    ),
  },

  upcoming: {
    title: 'No upcoming tasks',
    subtitle: 'Your schedule is clear. Add tasks with due dates to see them here.',
    color: 'text-blue-300 dark:text-blue-800',
    illustration: (
      <svg
        viewBox="0 0 120 120"
        fill="currentColor"
        aria-hidden="true"
        className="w-32 h-32"
      >
        {/* calendar body */}
        <rect x="18" y="28" width="84" height="72" rx="10" opacity="0.5" />
        {/* calendar header bar */}
        <rect x="18" y="28" width="84" height="22" rx="10" opacity="0.7" />
        {/* binding bumps */}
        <rect x="34" y="20" width="8" height="16" rx="4" opacity="0.6" />
        <rect x="78" y="20" width="8" height="16" rx="4" opacity="0.6" />
        {/* grid dots representing days */}
        {[
          [38, 68], [60, 68], [82, 68],
          [38, 84], [60, 84], [82, 84],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" opacity="0.3" />
        ))}
        {/* big check over calendar */}
        <circle cx="60" cy="56" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
        <path
          d="M53 56 l5 5 10-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    ),
  },

  projects: {
    title: 'Create your first project',
    subtitle:
      'Organise tasks into projects to keep everything in one place. Click the + button to get started.',
    color: 'text-emerald-300 dark:text-emerald-800',
    illustration: (
      <svg
        viewBox="0 0 120 120"
        fill="currentColor"
        aria-hidden="true"
        className="w-32 h-32"
      >
        {/* folder back */}
        <path
          d="M12 40 Q12 30 22 30 L46 30 Q50 30 52 34 L56 40 L98 40 Q108 40 108 50 L108 90 Q108 98 100 98 L20 98 Q12 98 12 90 Z"
          opacity="0.45"
        />
        {/* folder front flap */}
        <path
          d="M12 46 L108 46 L108 90 Q108 98 100 98 L20 98 Q12 98 12 90 Z"
          opacity="0.6"
        />
        {/* plus sign */}
        <line x1="60" y1="60" x2="60" y2="84" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <line x1="48" y1="72" x2="72" y2="72" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      </svg>
    ),
  },
}

export default function EmptyState({ type = 'inbox' }) {
  const config = CONFIGS[type] || CONFIGS.inbox
  const { title, subtitle, color, illustration } = config

  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-5 text-center select-none"
      aria-label={`Empty state: ${title}`}
    >
      <span className={color}>{illustration}</span>

      <div className="max-w-xs">
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200 leading-snug">
          {title}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
