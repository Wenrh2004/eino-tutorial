// Explicit list of every static page, generated from the chapter registry.
// Used as a safety net for TanStack Start's prerenderer so that every
// locale + chapter combination is emitted even if link-crawling misses one.
import { PARTS, LOCALES } from './chapters'

const chapterPaths = LOCALES.flatMap((locale) => [
  { path: `/${locale}` },
  ...PARTS.flatMap((part) =>
    part.chapters.map((c) => ({ path: `/${locale}/chapters/${c.slug}` })),
  ),
])

export const prerenderPages = [{ path: '/' }, ...chapterPaths]
