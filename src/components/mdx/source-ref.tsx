import * as React from 'react'
import { createPortal } from 'react-dom'
import { FileCode2, ExternalLink, X, Check, Copy } from 'lucide-react'
import { SOURCE_SNIPPETS, type SourceSnippet } from '@/generated/source-snippets'
import { useLocale } from '@/lib/locale-context'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Base URLs for permalinks into the upstream Eino source tree. */
const EINO_BLOB = 'https://github.com/cloudwego/eino/blob/main'
const EINO_EXT_BLOB = 'https://github.com/cloudwego/eino-ext/blob/main'
const EINO_EXAMPLES_BLOB = 'https://github.com/cloudwego/eino-examples/blob/main'

/**
 * Resolves a repo-relative anchor like `adk/react.go:210` into an absolute
 * GitHub permalink. Paths beginning with `eino-ext/` or `eino-examples/` are
 * routed to their respective repos; everything else targets `cloudwego/eino`.
 * Used as a fallback when no extracted snippet exists (e.g. directory anchors).
 */
function resolveHref(anchor: string): string {
  const [pathPart = anchor, line] = anchor.split(':')
  const hash = line ? `#L${line}` : ''
  if (pathPart.startsWith('eino-ext/')) {
    return `${EINO_EXT_BLOB}/${pathPart.slice('eino-ext/'.length)}${hash}`
  }
  if (pathPart.startsWith('eino-examples/')) {
    return `${EINO_EXAMPLES_BLOB}/${pathPart.slice('eino-examples/'.length)}${hash}`
  }
  // eino-examples content sometimes referenced without a repo prefix.
  if (
    pathPart.startsWith('quickstart/') ||
    pathPart.startsWith('flow/agent/') ||
    pathPart.startsWith('devops/')
  ) {
    return `${EINO_EXAMPLES_BLOB}/${pathPart}${hash}`
  }
  return `${EINO_BLOB}/${pathPart}${hash}`
}

/**
 * Inline reference to a source-code anchor. Renders as a monospace chip. When a
 * snippet was extracted at build time (see scripts/gen-source-snippets.mjs) the
 * chip opens an in-page preview of the *real* code — line-numbered and
 * syntax-highlighted — so readers verify claims without leaving the page. Anchors
 * that resolve to a directory (or a missing file) fall back to a GitHub link.
 */
export function SourceRef({ path }: { path: string }) {
  const locale = useLocale()
  const [open, setOpen] = React.useState(false)
  const snippet: SourceSnippet | undefined = SOURCE_SNIPPETS[path]

  const chipClass =
    'bg-muted hover:bg-accent hover:text-accent-foreground text-muted-foreground mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline font-mono text-[0.8em] no-underline transition-colors'

  if (!snippet) {
    // No extractable code (directory anchor, etc.) — link straight to GitHub.
    return (
      <a href={resolveHref(path)} target="_blank" rel="noreferrer" className={chipClass}>
        <FileCode2 className="size-3 shrink-0" />
        {path}
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(chipClass, 'cursor-pointer')}
        title={t(locale, 'source.preview')}
      >
        <FileCode2 className="size-3 shrink-0" />
        {path}
      </button>
      {open && <SourcePreview snippet={snippet} onClose={() => setOpen(false)} />}
    </>
  )
}

/** The modal preview overlay. Rendered via portal, client-side only. */
function SourcePreview({
  snippet,
  onClose,
}: {
  snippet: SourceSnippet
  onClose: () => void
}) {
  const locale = useLocale()
  const [copied, setCopied] = React.useState(false)

  // Escape to close + lock body scroll while open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const copy = async () => {
    // Strip HTML tags to recover the raw code for the clipboard.
    const text = snippet.html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="source-preview bg-card mt-8 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: path, line range, actions. */}
        <div className="bg-muted/50 flex items-center gap-3 border-b px-4 py-2.5">
          <FileCode2 className="text-primary size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold">{snippet.path}</p>
            <p className="text-muted-foreground font-mono text-[11px]">
              {snippet.repo} ·{' '}
              {t(locale, 'source.lines', {
                a: snippet.startLine,
                b: snippet.endLine,
                n: snippet.totalLines,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
            title={t(locale, 'source.copy')}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? t(locale, 'source.copied') : t(locale, 'source.copy')}
          </button>
          <a
            href={snippet.href}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
            title={t(locale, 'source.viewOnGithub')}
          >
            <ExternalLink className="size-3.5" />
            GitHub
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors"
            aria-label={t(locale, 'source.close')}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Highlighted snippet, extracted verbatim at build time. */}
        <div
          className="min-h-0 flex-1 overflow-auto"
          // eslint-disable-next-line react/no-danger -- trusted build-time Shiki HTML
          dangerouslySetInnerHTML={{ __html: snippet.html }}
        />
      </div>
    </div>,
    document.body,
  )
}
