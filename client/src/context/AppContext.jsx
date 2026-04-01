import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import Pomodoro from '../utils/pomodoro'

export const AppContext = createContext(null)

const WORK_SECONDS = 25 * 60

/**
 * AppProvider wraps the app and exposes focus-mode state + Pomodoro state to all children.
 *
 * Pomodoro state:
 *   timeRemaining      — seconds left in current session
 *   isRunning          — whether the timer is ticking
 *   completedPomodoros — how many work sessions finished this session
 *   currentTaskId      — task the timer is linked to
 *
 * Pomodoro functions:
 *   startPomodoro(taskId) — start (or resume) the timer for a given task
 *   pausePomodoro()       — pause the running timer
 *   resetPomodoro()       — reset to a fresh 25-min work session
 */
export function AppProvider({ children, value: externalValue }) {
  const [isFocusMode, setIsFocusMode] = useState(
    () => sessionStorage.getItem('focusMode') === 'true'
  )

  // Pomodoro state
  const [timeRemaining, setTimeRemaining] = useState(WORK_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState(null)

  // Stable callback refs so Pomodoro instance callbacks never go stale
  const currentTaskIdRef = useRef(null)
  const setTimeRemainingRef = useRef(setTimeRemaining)
  const setCompletedPomodorosRef = useRef(setCompletedPomodoros)

  // Pomodoro instance ref — initialized in useEffect to avoid ref-write-during-render lint error
  const pomodoroRef = useRef(null)

  useEffect(() => {
    const onTick = ({ total }) => {
      setTimeRemainingRef.current(total)
    }

    const onComplete = ({ isBreak, completedCount }) => {
      if (!isBreak) {
        // Work session finished — update completed count
        setCompletedPomodorosRef.current(completedCount)

        // Fire desktop notification if permission granted (#79)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Time up! Take a 5min break', {
            body: `You completed ${completedCount} Pomodoro${completedCount !== 1 ? 's' : ''} today. Well done!`,
            icon: '/favicon.ico',
          })
        }
      }
    }

    pomodoroRef.current = new Pomodoro(onTick, onComplete)

    return () => {
      if (pomodoroRef.current) {
        pomodoroRef.current.pause()
      }
    }
  }, []) // Run only once on mount

  const startPomodoro = useCallback((taskId = null) => {
    currentTaskIdRef.current = taskId
    setCurrentTaskId(taskId)
    setIsRunning(true)
    pomodoroRef.current?.start()
  }, [])

  const pausePomodoro = useCallback(() => {
    setIsRunning(false)
    pomodoroRef.current?.pause()
  }, [])

  const resetPomodoro = useCallback(() => {
    pomodoroRef.current?.reset()
    setTimeRemaining(WORK_SECONDS)
    setIsRunning(false)
    setCurrentTaskId(null)
    currentTaskIdRef.current = null
  }, [])

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev
      sessionStorage.setItem('focusMode', String(next))

      if (next) {
        // Focus Mode turning ON (#78, #79)
        // Request notification permission on first activation
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
        // Auto-start Pomodoro
        setCurrentTaskId(null)
        currentTaskIdRef.current = null
        setIsRunning(true)
        pomodoroRef.current?.start()
      } else {
        // Focus Mode turning OFF — pause timer
        pomodoroRef.current?.pause()
        setIsRunning(false)
      }

      return next
    })
  }, [])

  const internalValue = {
    isFocusMode,
    toggleFocusMode,
    // Pomodoro state
    timeRemaining,
    isRunning,
    completedPomodoros,
    currentTaskId,
    // Pomodoro actions
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
  }

  const contextValue = externalValue ?? internalValue

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
