// Resolves authored MDX content for a given locale + slug.
// Written chapters live at src/content/{locale}/{slug}.mdx and are eagerly
// bundled via Vite's import.meta.glob. Missing entries fall back to null so the
// route can render the generated placeholder instead.
import type { ComponentType } from 'react'
import type { Locale } from './chapters'

type MDXModule = { default: ComponentType<Record<string, unknown>> }

const modules = import.meta.glob<MDXModule>('./*/*.mdx', { eager: true })

/** Returns the MDX component for a chapter, or null when not yet authored. */
export function getChapterContent(
  locale: Locale,
  slug: string,
): ComponentType<Record<string, unknown>> | null {
  const key = `./${locale}/${slug}.mdx`
  const mod = modules[key]
  return mod ? mod.default : null
}
