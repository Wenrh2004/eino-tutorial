import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Lazily load mermaid exactly once. It touches the DOM at import/parse time, so
 * it must never run during SSR/prerender — we only ever call this inside a
 * client `useEffect`.
 */
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default)
  }
  return mermaidPromise
}

// Monotonic id so each render targets a unique temp element inside mermaid.
let renderSeq = 0

/**
 * Brand-aligned theme variables for mermaid's `base` theme. Hex values (not
 * oklch) so mermaid's internal color math (khroma) parses them cleanly. They
 * approximate the site's `--viz-*` / `--primary` tokens in each mode.
 */
const THEME_VARS = {
  light: {
    background: '#ffffff',
    primaryColor: '#eaf6f7',
    primaryBorderColor: '#0d9aa5',
    primaryTextColor: '#1a2b33',
    lineColor: '#7c8b94',
    secondaryColor: '#eef2f4',
    secondaryBorderColor: '#9aa7ae',
    secondaryTextColor: '#1a2b33',
    tertiaryColor: '#f7fafb',
    tertiaryBorderColor: '#c7d0d5',
    noteBkgColor: '#fdf6e3',
    noteBorderColor: '#d9c98a',
  },
  dark: {
    background: '#23272e',
    primaryColor: '#22303a',
    primaryBorderColor: '#3fbcc9',
    primaryTextColor: '#e6edf0',
    lineColor: '#66757f',
    secondaryColor: '#2a2f37',
    secondaryBorderColor: '#4a555d',
    secondaryTextColor: '#e6edf0',
    tertiaryColor: '#20242b',
    tertiaryBorderColor: '#3a434b',
    noteBkgColor: '#33302410',
    noteBorderColor: '#5c5636',
  },
} as const

/**
 * `<Mermaid chart="..." title="..." />` — renders a Mermaid diagram inside the
 * same figure chrome as the interactive visualizations. Rendering is client-only
 * (mermaid needs the DOM) and re-runs when the site theme flips, which we detect
 * by observing the `.dark` class on `<html>` (the same signal the theme toggle
 * writes). During SSR/prerender it emits an empty, sized frame that hydration
 * fills in — consistent with the other client-rendered viz on the site.
 */
export function Mermaid({ chart, title }: { chart: string; title?: React.ReactNode }) {
  const [svg, setSvg] = React.useState('')
  const [isDark, setIsDark] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const read = () => setIsDark(root.classList.contains('dark'))
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setFailed(false)
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          themeVariables: isDark ? THEME_VARS.dark : THEME_VARS.light,
          flowchart: { curve: 'basis', htmlLabels: true, padding: 12 },
          sequence: { useMaxWidth: true },
        })
        const id = `mmd-${renderSeq++}`
        const { svg: out } = await mermaid.render(id, chart)
        if (!cancelled) setSvg(out)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [chart, isDark])

  return (
    <figure className="not-prose bg-card my-8 overflow-hidden rounded-xl border shadow-sm">
      {title && (
        <figcaption className="bg-muted/50 border-b px-4 py-2.5 text-sm font-semibold">
          {title}
        </figcaption>
      )}
      <div
        className={cn(
          'flex min-h-[160px] items-center justify-center overflow-x-auto p-4 sm:p-6',
          '[&_svg]:h-auto [&_svg]:max-w-full',
        )}
      >
        {failed ? (
          <pre className="text-muted-foreground w-full overflow-x-auto text-xs">
            <code>{chart}</code>
          </pre>
        ) : svg ? (
          <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <span className="text-muted-foreground text-xs">◌</span>
        )}
      </div>
    </figure>
  )
}
