import SearchBar from './SearchBar'

export default function TopBar({ onToggleSidebar, onSearch, onAddTask, onToggleDark, onSearchNavigate, userName = 'User', darkMode = false, className = '' }) {
  const initials = userName
    ? userName.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : 'U'

  return (
    <div className={`flex flex-row items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white w-full${className ? ` ${className}` : ''}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-semibold">Todoist Enhanced</span>
      </div>
      <SearchBar onNavigate={onSearchNavigate} />
      <div className="flex items-center gap-3 w-48 justify-end">
        {/* Add Task button */}
        <button
          onClick={onAddTask}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
          aria-label="Add task (Ctrl+N)"
        >
          <span>+ Add Task</span>
          <span className="text-xs opacity-70 ml-1">(Ctrl+N)</span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" strokeWidth={2} strokeLinecap="round" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold select-none cursor-default shrink-0"
          aria-label={`User: ${userName}`}
          title={userName}
        >
          {initials}
        </div>
      </div>
    </div>
  )
}
