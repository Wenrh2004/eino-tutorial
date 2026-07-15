import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { t, type Locale } from '@/lib/i18n'
import { PARTS } from '@/content/chapters'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  locale: Locale
  activeSlug?: string
  onNavigate?: () => void
}

export function Sidebar({ locale, activeSlug, onNavigate }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-6 py-6 pr-2 text-sm">
      <Link
        to="/$locale"
        params={{ locale }}
        onClick={onNavigate}
        className={cn(
          'hover:text-primary text-muted-foreground font-medium transition-colors',
          !activeSlug && 'text-primary',
        )}
      >
        {t(locale, 'nav.overview')}
      </Link>

      {PARTS.map((part) => (
        <div key={part.id} className="flex flex-col gap-1.5">
          <p className="text-muted-foreground/80 mb-1 text-[11px] font-semibold uppercase tracking-wider">
            {part.title[locale]}
          </p>
          <ul className="flex flex-col gap-0.5">
            {part.chapters.map((c) => {
              const active = c.slug === activeSlug
              return (
                <li key={c.slug}>
                  <Link
                    to="/$locale/chapters/$slug"
                    params={{ locale, slug: c.slug }}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-start gap-2 rounded-md px-2 py-1.5 leading-snug transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-px inline-block w-5 shrink-0 text-right text-[11px] tabular-nums',
                        active ? 'text-primary' : 'text-muted-foreground/60',
                      )}
                    >
                      {c.number}
                    </span>
                    <span className="flex-1">{c.title[locale]}</span>
                    {c.viz && (
                      <Badge
                        variant="secondary"
                        className="mt-px px-1 py-0 text-[9px] leading-tight"
                        title="interactive"
                      >
                        VIZ
                      </Badge>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
