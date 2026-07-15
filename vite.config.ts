import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'

import { prerenderPages } from './src/content/prerender'
import { generateSourceSnippets } from './scripts/gen-source-snippets.mjs'

const rehypePrettyCodeOptions = {
  theme: { dark: 'github-dark-dimmed', light: 'github-light' },
  keepBackground: false,
  defaultLang: 'go',
}

/**
 * Regenerate the source-snippet map (used by in-page <SourceRef> previews) from
 * the sibling eino* repos before dev and build. Kept as a `buildStart` hook so a
 * fresh checkout produces the generated file without a manual pre-step.
 */
function sourceSnippetsPlugin(): Plugin {
  return {
    name: 'eino-source-snippets',
    async buildStart() {
      try {
        await generateSourceSnippets({ silent: true })
      } catch (err) {
        this.warn(`source-snippet generation skipped: ${(err as Error).message}`)
      }
    },
  }
}

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    sourceSnippetsPlugin(),
    // MDX must run before the React transform.
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm, remarkFrontmatter],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          [rehypePrettyCode, rehypePrettyCodeOptions],
        ],
      }),
    },
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      // Fully static output: crawl from the root and prerender every route,
      // with an explicit page list as a safety net for dynamic segments.
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        concurrency: 8,
      },
      pages: prerenderPages,
    }),
    viteReact(),
  ],
})
