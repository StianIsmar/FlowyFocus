import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeProvider'

interface Props {
  collapsed?: boolean
}

export default function ThemeToggle({ collapsed = false }: Props) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      className={`theme-toggle ${collapsed ? 'icon-only' : ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={`Use ${nextTheme} theme`}
      title={`Use ${nextTheme} theme`}
    >
      <Icon size={16} aria-hidden />
      {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}