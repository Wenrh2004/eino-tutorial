import type { ComponentProps } from 'react'
import { SourceRef } from './source-ref'
import { Callout } from './callout'
import { Mermaid } from './mermaid'
import { useLocale } from '@/lib/locale-context'
import { ChapterViz } from '@/components/viz/chapter-viz'
import type { Chapter } from '@/content/chapters'

/**
 * `<Viz name="react-loop" />` — embeds a flagship visualization inside prose,
 * pulling the active locale from context so MDX authors don't thread it through.
 */
function Viz({ name }: { name: NonNullable<Chapter['viz']> }) {
  const locale = useLocale()
  return <ChapterViz viz={name} locale={locale} />
}

/**
 * The component map handed to MDXProvider. Custom components (SourceRef,
 * Callout, Viz) are available in every chapter without imports; a few HTML
 * elements are lightly wrapped for consistency.
 */
export const mdxComponents = {
  SourceRef,
  Callout,
  Viz,
  Mermaid,
  // Keep external links safe by default.
  a: (props: ComponentProps<'a'>) => {
    const external = props.href?.startsWith('http')
    return external ? <a target="_blank" rel="noreferrer" {...props} /> : <a {...props} />
  },
}
