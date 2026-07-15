import * as React from 'react'
import { cn } from '@/lib/utils'
import { t, type Locale } from '@/lib/i18n'

interface Heading {
  id: string
  text: string
  level: number
}

/**
 * "On this page" navigation. Reads h2/h3 headings from the rendered article
 * after mount (MDX + rehype-slug guarantee stable ids) and highlights the
 * heading currently in view via an IntersectionObserver.
 */
export function Toc({ locale, contentKey }: { locale: Locale; contentKey: string }) {
  const [headings, setHeadings] = React.useState<Heading[]>([])
  const [activeId, setActiveId] = React.useState<string>('')

  React.useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return
    const nodes = Array.from(article.querySelectorAll('h2, h3')) as HTMLElement[]
    const found = nodes
      .filter((n) => n.id)
      .map((n) => ({
        id: n.id,
        text: n.textContent?.replace(/#$/, '').trim() ?? '',
        level: n.tagName === 'H2' ? 2 : 3,
      }))
    setHeadings(found)

    if (found.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    )
    for (const n of nodes) if (n.id) observer.observe(n)
    return () => observer.disconnect()
    // Re-run when the chapter changes.
  }, [contentKey])

  if (headings.length === 0) return null

  return (
    <nav className="text-sm">
      <p className="text-muted-foreground/80 mb-3 text-[11px] font-semibold uppercase tracking-wider">
        {t(locale, 'nav.onThisPage')}
      </p>
      <ul className="flex flex-col gap-1 border-l">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                '-ml-px block border-l py-0.5 leading-snug transition-colors',
                h.level === 3 ? 'pl-6' : 'pl-3',
                activeId === h.id
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
