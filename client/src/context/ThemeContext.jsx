import { createContext, useContext, useState, useEffect } from 'react'

export const ThemeContext = createContext(null)

/**
 * ThemeProvider — manages dark/light mode with localStorage persistence.
 *
 * Dark mode:  bg #1F1F1F, text #FFFFFF, accent #DB4035
 * Light mode: bg #FFFFFF, text #202020
 *
 * Applies class="dark" to the <html> element for Tailwind dark mode.
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
