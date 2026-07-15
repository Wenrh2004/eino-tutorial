import { Link, useLocation } from '@tanstack/react-router'
import { Moon, Sun, Github, Menu } from 'lucide-react'
import { useTheme } from '@/lib/use-theme'
import { t, otherLocale, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  locale: Locale
  onMenuClick?: () => void
}

export function Header({ locale, onMenuClick }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const location = useLocation()

  // Preserve the current chapter when switching language.
  const other = otherLocale(locale)
  const swappedPath = location.pathname.replace(/^\/(zh|en)/, `/${other}`)

  return (
    <header className="bg-background/85 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[100rem] items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Menu"
        >
          <Menu />
        </Button>

        <Link to="/$locale" params={{ locale }} className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg font-bold">
            E
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">{t(locale, 'site.title')}</span>
            <span className="text-muted-foreground text-[11px]">{t(locale, 'site.tagline')}</span>
          </span>
        </Link>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" asChild>
          <Link to={swappedPath}>{t(locale, 'lang.toggle')}</Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={t(locale, 'theme.toggle')}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="GitHub">
          <a href="https://github.com/cloudwego/eino" target="_blank" rel="noreferrer">
            <Github />
          </a>
        </Button>
      </div>
    </header>
  )
}
