import * as React from 'react'

type Theme = 'light' | 'dark'

/**
 * Minimal theme controller. The no-flash script in __root.tsx has already
 * applied the correct class before hydration; this hook keeps React in sync
 * and persists user choices to localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>('light')

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    const root = document.documentElement
    root.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('eino-theme', next)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
