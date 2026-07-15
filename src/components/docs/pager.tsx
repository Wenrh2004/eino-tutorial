import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getAdjacent } from '@/content/chapters'
import { t, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function Pager({ locale, slug }: { locale: Locale; slug: string }) {
  const { prev, next } = getAdjacent(slug)
  return (
    <div className="mt-12 grid grid-cols-2 gap-4 border-t pt-6">
      <div>
        {prev && (
          <Link
            to="/$locale/chapters/$slug"
            params={{ locale, slug: prev.slug }}
            className={cn(
              'group hover:border-primary hover:bg-accent/40 flex flex-col gap-1 rounded-lg border p-3 transition-colors',
            )}
          >
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <ArrowLeft className="size-3" />
              {t(locale, 'nav.prev')}
            </span>
            <span className="text-sm font-medium">{prev.title[locale]}</span>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            to="/$locale/chapters/$slug"
            params={{ locale, slug: next.slug }}
            className="group hover:border-primary hover:bg-accent/40 flex flex-col items-end gap-1 rounded-lg border p-3 text-right transition-colors"
          >
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              {t(locale, 'nav.next')}
              <ArrowRight className="size-3" />
            </span>
            <span className="text-sm font-medium">{next.title[locale]}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
