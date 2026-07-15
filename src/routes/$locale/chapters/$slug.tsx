import { createFileRoute, notFound, useParams } from '@tanstack/react-router'
import { MDXProvider } from '@mdx-js/react'
import { isLocale, t } from '@/lib/i18n'
import { getChapter, getPartOf } from '@/content/chapters'
import { getChapterContent } from '@/content/registry'
import { mdxComponents } from '@/components/mdx/mdx-components'
import { SourceRef } from '@/components/mdx/source-ref'
import { ChapterViz } from '@/components/viz/chapter-viz'
import { Toc } from '@/components/docs/toc'
import { Pager } from '@/components/docs/pager'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/$locale/chapters/$slug')({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) throw notFound()
    if (!getChapter(params.slug)) throw notFound()
  },
  component: ChapterPage,
})

function ChapterPage() {
  const { locale, slug } = useParams({ from: '/$locale/chapters/$slug' })
  if (!isLocale(locale)) return null

  const chapter = getChapter(slug)
  if (!chapter) return null
  const part = getPartOf(slug)
  const Content = getChapterContent(locale, slug)

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10">
      <article className="prose-doc min-w-0 flex-1">
        {/* Chapter header. */}
        <div className="not-prose mb-8 border-b pb-6">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {part && <span className="font-medium">{part.title[locale]}</span>}
            <span>·</span>
            <span>{t(locale, 'chapter.number', { n: chapter.number })}</span>
            {chapter.viz && (
              <Badge variant="secondary" className="text-[10px]">
                VIZ
              </Badge>
            )}
            <Badge
              variant={chapter.status === 'written' ? 'success' : 'outline'}
              className="text-[10px]"
            >
              {chapter.status === 'written'
                ? t(locale, 'status.written')
                : t(locale, 'status.placeholder')}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{chapter.title[locale]}</h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            {chapter.summary[locale]}
          </p>
        </div>

        {/* Body: authored MDX, or a structured placeholder. */}
        {Content ? (
          <MDXProvider components={mdxComponents}>
            <Content />
          </MDXProvider>
        ) : (
          <ChapterPlaceholder locale={locale} slug={slug} />
        )}

        <Pager locale={locale} slug={slug} />
      </article>

      {/* Right rail: on-this-page. */}
      <aside className="sticky top-20 hidden h-[calc(100svh-6rem)] w-56 shrink-0 overflow-y-auto xl:block">
        <Toc locale={locale} contentKey={slug} />
      </aside>
    </div>
  )
}

/** Structured placeholder for chapters that aren't authored yet. */
function ChapterPlaceholder({
  locale,
  slug,
}: {
  locale: 'zh' | 'en'
  slug: string
}) {
  const chapter = getChapter(slug)!
  return (
    <div>
      {chapter.viz && (
        <div className="not-prose mb-8">
          <ChapterViz viz={chapter.viz} locale={locale} />
        </div>
      )}

      <div className="not-prose bg-muted/40 mb-8 rounded-lg border border-dashed p-5">
        <p className="font-semibold">{t(locale, 'placeholder.title')}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {t(locale, 'placeholder.body')}
        </p>
      </div>

      {chapter.sources && chapter.sources.length > 0 && (
        <div className="not-prose">
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            {t(locale, 'nav.sources')}
          </p>
          <div className="flex flex-wrap gap-2">
            {chapter.sources.map((src) => (
              <SourceRef key={src} path={src} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
