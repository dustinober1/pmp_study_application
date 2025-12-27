'use client'

import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const themeIcons = {
    light: '☀️',
    dark: '🌙',
    system: '🖥️',
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      title={`Current theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <span className="text-lg">{themeIcons[theme]}</span>
    </button>
  )
}
