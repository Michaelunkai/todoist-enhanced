/**
 * ProjectProgress — shows a thin progress bar + "X/Y completed (Z%)" label
 * below a project name in the sidebar.
 *
 * Props:
 *   completedCount  {number}  — tasks marked done in this project
 *   totalCount      {number}  — total tasks in this project (all states)
 */
export default function ProjectProgress({ completedCount = 0, totalCount = 0 }) {
  if (totalCount === 0) return null

  const percentage = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="mt-0.5 px-1">
      {/* Progress bar */}
      <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-1 overflow-hidden">
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: percentage === 100 ? '#22c55e' : '#6366f1',
          }}
        />
      </div>

      {/* X/Y label and percentage */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
        {completedCount}/{totalCount} &middot; {percentage}%
      </p>
    </div>
  )
}
