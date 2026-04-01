import { useState, useEffect, useRef, useCallback } from 'react'

const WORK_SECONDS = 25 * 60   // 25 minutes
const BREAK_SECONDS = 5 * 60   // 5 minutes

/**
 * PomodoroTimer — shown inside Focus Mode overlay.
 * Starts automatically when Focus Mode is entered.
 * Displays MM:SS countdown, pause/resume, and reset controls.
 */
export default function PomodoroTimer({ onExit }) {
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS)
  const [isRunning, setIsRunning] = useState(true)
  const [isBreak, setIsBreak] = useState(false)
  const intervalRef = useRef(null)

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Switch between work and break
        setIsBreak((b) => {
          const nextBreak = !b
          setSecondsLeft(nextBreak ? BREAK_SECONDS : WORK_SECONDS)
          return nextBreak
        })
        return 0
      }
      return prev - 1
    })
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, tick])

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  const progress = isBreak
    ? 1 - secondsLeft / BREAK_SECONDS
    : 1 - secondsLeft / WORK_SECONDS

  const handleReset = () => {
    setIsBreak(false)
    setSecondsLeft(WORK_SECONDS)
    setIsRunning(true)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Pomodoro card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-6 min-w-[280px]">
        {/* Phase label */}
        <p className="text-sm font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500">
          {isBreak ? 'Break Time' : 'Focus Session'}
        </p>

        {/* Countdown ring */}
        <div className="relative w-40 h-40" role="timer" aria-label={`${minutes}:${seconds} remaining`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background track */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor"
              className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
            {/* Progress arc */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor"
              className={isBreak ? 'text-green-500' : 'text-red-500'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          {/* Time display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
              {minutes}:{seconds}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Pause / Resume */}
          <button
            onClick={() => setIsRunning((r) => !r)}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Reset timer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Exit Focus Mode button — prominently placed below the card */}
      <button
        onClick={onExit}
        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-semibold shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label="Exit Focus Mode"
      >
        Exit Focus Mode <span aria-hidden="true">&#x2715;</span>
      </button>
    </div>
  )
}
