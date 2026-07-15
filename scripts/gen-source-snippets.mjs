// Build-time source-snippet extractor.
//
// Every <SourceRef path="pkg/file.go:NN" /> in the tutorial points at real code
// in the CloudWeGo repos (eino / eino-ext / eino-examples). This script fetches
// the *actual* lines for each anchor over the network from GitHub at a pinned
// commit per repo (see REPO_REFS), syntax-highlights them with the same Shiki
// dual-theme used for prose code blocks, and emits a generated map that the
// SourceRef component loads on demand to render an in-page preview. Pinning to a
// commit — rather than reading a local checkout — makes generation reproducible
// on any machine and keeps the extracted snippets aligned with the exact line
// numbers the chapters were written against.
//
// Run standalone with `node scripts/gen-source-snippets.mjs` (needs network), or
// let the Vite plugin in vite.config.ts invoke it automatically on dev/build.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeToHtml } from 'shiki'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const OUT_FILE = join(PROJECT_ROOT, 'src/generated/source-snippets.ts')

// Pinned commit per repo. Source lines (and therefore <SourceRef> line numbers)
// are resolved against these exact commits, so previews never drift even as the
// upstream default branch moves on. Bump a SHA here when re-aligning anchors to a
// newer revision, then re-run this script.
const REPO_REFS = {
  eino: '922b6a8a233b5233fe47eecee6cd2c005e8c39cd',
  'eino-ext': '550170e5a9e02695fe2cc69a7d3a665b94b6825e',
  'eino-examples': '171220631fb7068ead50b7cd964b8c471647117d',
}

const RAW_BASE = 'https://raw.githubusercontent.com'
const GITHUB_BLOB = {
  eino: 'https://github.com/cloudwego/eino/blob',
  'eino-ext': 'https://github.com/cloudwego/eino-ext/blob',
  'eino-examples': 'https://github.com/cloudwego/eino-examples/blob',
}

// Window sizes (in lines) for the inline preview.
const BEFORE = 6 // context lines above a targeted line (fallback window)
const AFTER = 24 // context lines below a targeted line (fallback window)
const HEAD = 40 // lines to show for a file-only anchor (no line number)
// A complete enclosing declaration is always shown in full — the requirement is
// that a snippet is a whole function, never sliced through the middle. This cap
// is only a guard against a pathologically huge generated file; real eino decls
// top out around ~250 lines, so it never truncates an actual function.
const MAX_BLOCK = 400
// Very short declarations (e.g. a one-line type alias) are padded with whole
// neighboring declarations — never partial ones — up to this many lines, so the
// preview carries useful context without ever cutting a function in half.
const MIN_BLOCK = 12

/**
 * Split a Go file into its top-level declaration ranges (package / import / func
 * / type / var / const). Uses a comment-, string-, rune-, and raw-string-aware
 * bracket balancer so braces inside comments or literals never throw off the
 * nesting count. A declaration starts at a column-0 keyword and ends on the line
 * where bracket depth returns to zero. Returns 0-based inclusive { start, end }
 * ranges in source order.
 */
function computeTopLevelDecls(lines) {
  const decls = []
  const kw = /^(package|import|func|type|var|const)\b/
  let depth = 0
  let inBlockComment = false
  let inRaw = false // backtick raw string
  let curStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      depth === 0 &&
      !inBlockComment &&
      !inRaw &&
      curStart === -1 &&
      !/^\s/.test(line) &&
      kw.test(line)
    ) {
      curStart = i
    }

    let j = 0
    let inStr = false // "..."
    let inRune = false // '...'
    while (j < line.length) {
      const c = line[j]
      const c2 = line[j + 1]
      if (inBlockComment) {
        if (c === '*' && c2 === '/') {
          inBlockComment = false
          j += 2
          continue
        }
        j++
        continue
      }
      if (inRaw) {
        if (c === '`') inRaw = false
        j++
        continue
      }
      if (inStr) {
        if (c === '\\') {
          j += 2
          continue
        }
        if (c === '"') inStr = false
        j++
        continue
      }
      if (inRune) {
        if (c === '\\') {
          j += 2
          continue
        }
        if (c === "'") inRune = false
        j++
        continue
      }
      if (c === '/' && c2 === '/') break // line comment: rest of line is inert
      if (c === '/' && c2 === '*') {
        inBlockComment = true
        j += 2
        continue
      }
      if (c === '"') {
        inStr = true
        j++
        continue
      }
      if (c === '`') {
        inRaw = true
        j++
        continue
      }
      if (c === "'") {
        inRune = true
        j++
        continue
      }
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') depth--
      j++
    }

    if (curStart !== -1 && depth <= 0 && !inBlockComment && !inRaw) {
      decls.push({ start: curStart, end: i })
      curStart = -1
      if (depth < 0) depth = 0
    }
  }
  return decls
}

/**
 * Find the complete top-level Go declaration enclosing a 0-based target line,
 * folding in the declaration's leading doc-comment lines. When the anchor sits
 * on a doc comment directly above a declaration, that declaration is used.
 * Returns a 0-based inclusive { start, end }, or null if the target is not part
 * of any declaration (caller then falls back to a fixed window).
 */
function enclosingGoBlock(lines, t) {
  const decls = computeTopLevelDecls(lines)
  const withDoc = (s) => {
    while (s > 0 && lines[s - 1].trimStart().startsWith('//')) s--
    return s
  }

  let idx = -1
  for (let d = 0; d < decls.length; d++) {
    const { start, end } = decls[d]
    if (t >= withDoc(start) && t <= end) {
      idx = d
      break
    }
  }
  if (idx === -1) return null

  let start = withDoc(decls[idx].start)
  let end = decls[idx].end

  // Pad a very short declaration with whole neighboring declarations (never
  // partial) so the preview is not a lonely one-liner.
  let lo = idx
  let hi = idx
  while (end - start + 1 < MIN_BLOCK && (lo > 0 || hi < decls.length - 1)) {
    if (hi < decls.length - 1) {
      hi++
      end = decls[hi].end
    } else if (lo > 0) {
      lo--
      start = withDoc(decls[lo].start)
    } else break
  }

  return { start, end }
}

/** Mirror of SourceRef.resolveHref: map an anchor to a repo + repo-relative path. */
function resolveAnchor(anchor) {
  const [pathPart, lineStr] = anchor.split(':')
  const line = lineStr ? Number.parseInt(lineStr, 10) : null

  let repo = 'eino'
  let filePath = pathPart
  if (pathPart.startsWith('eino-ext/')) {
    repo = 'eino-ext'
    filePath = pathPart.slice('eino-ext/'.length)
  } else if (pathPart.startsWith('eino-examples/')) {
    repo = 'eino-examples'
    filePath = pathPart.slice('eino-examples/'.length)
  } else if (
    pathPart.startsWith('quickstart/') ||
    pathPart.startsWith('flow/agent/') ||
    pathPart.startsWith('devops/')
  ) {
    repo = 'eino-examples'
  }

  return { repo, filePath, pathPart, line }
}

function langFor(filePath) {
  if (filePath.endsWith('.go')) return 'go'
  if (filePath.endsWith('.md') || filePath.endsWith('.mdx')) return 'markdown'
  if (filePath.endsWith('.json')) return 'json'
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript'
  if (filePath.endsWith('.sh')) return 'bash'
  return 'text'
}

/** Find the first line of real code, skipping a leading Apache license block. */
function firstCodeLine(lines) {
  if (lines[0]?.trimStart().startsWith('/*')) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('*/')) {
        let j = i + 1
        while (j < lines.length && lines[j].trim() === '') j++
        return j // 0-based index
      }
    }
  }
  return 0
}

// Cache raw file bodies so multiple anchors into the same file fetch it once.
// Value is the file text, or null when the file is missing (HTTP 404).
const fileCache = new Map()

/** Fetch a repo file at its pinned commit. Returns text, or null on 404. */
async function fetchRepoFile(repo, filePath) {
  const key = `${repo}/${filePath}`
  if (fileCache.has(key)) return fileCache.get(key)

  const ref = REPO_REFS[repo]
  const url = `${RAW_BASE}/cloudwego/${repo}/${ref}/${filePath}`
  const res = await fetch(url)
  if (res.status === 404) {
    fileCache.set(key, null)
    return null
  }
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: HTTP ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  fileCache.set(key, text)
  return text
}

/**
 * Extract + highlight one anchor. Returns null when the target is a directory
 * or missing file (the chip then degrades to a plain GitHub link).
 */
async function buildSnippet(anchor) {
  if (anchor.endsWith('/')) return null // directory anchor — no single file

  const { repo, filePath, pathPart, line } = resolveAnchor(anchor)
  const raw = await fetchRepoFile(repo, filePath)
  if (raw == null) return null

  const allLines = raw.replace(/\n$/, '').split('\n')
  const total = allLines.length

  let start // 0-based, inclusive
  let end // 0-based, exclusive
  let focusLine = null
  if (line != null && line >= 1 && line <= total) {
    focusLine = line
    const t = line - 1 // 0-based target
    // Always show the full enclosing Go declaration — a snippet must be a whole
    // function/type, never sliced through the middle. MAX_BLOCK is only a guard
    // against a pathologically large file; real eino declarations stay well
    // under it, so a function is never truncated in practice.
    const block = filePath.endsWith('.go') ? enclosingGoBlock(allLines, t) : null
    if (block) {
      start = block.start
      end = Math.min(block.end + 1, block.start + MAX_BLOCK)
    } else {
      // Not inside a recognizable block — fall back to a fixed window.
      start = Math.max(0, t - BEFORE)
      end = Math.min(total, t + AFTER + 1)
    }
  } else {
    start = firstCodeLine(allLines)
    end = Math.min(total, start + HEAD)
  }

  const startLine = start + 1 // 1-based
  const code = allLines.slice(start, end).join('\n')
  const lang = langFor(filePath)

  const html = await codeToHtml(code, {
    lang,
    themes: { dark: 'github-dark-dimmed', light: 'github-light' },
    defaultColor: false,
    transformers: [
      {
        line(node, relLine) {
          const ln = startLine + relLine - 1
          node.properties['data-ln'] = String(ln)
          if (focusLine != null && ln === focusLine) {
            node.properties['data-focus'] = 'true'
          }
        },
      },
    ],
  })

  const hash = line ? `#L${line}` : ''
  const href = `${GITHUB_BLOB[repo]}/${REPO_REFS[repo]}/${filePath}${hash}`

  return {
    anchor,
    path: pathPart,
    repo,
    lang,
    href,
    startLine,
    endLine: end, // 1-based inclusive == end (since end is exclusive 0-based)
    focusLine,
    totalLines: total,
    html,
  }
}

/** Collect every anchor referenced across chapters.ts and the MDX content. */
async function collectAnchors() {
  const anchors = new Set()

  const contentDir = join(PROJECT_ROOT, 'src/content')
  const chaptersTs = await readFile(join(contentDir, 'chapters.ts'), 'utf8')
  // sources: ['adk/interface.go', 'adk/interface.go:43', ...]
  for (const m of chaptersTs.matchAll(/'([^']+\.go(?::\d+)?)'/g)) {
    anchors.add(m[1])
  }
  // directory anchors like 'adk/middlewares/' — captured for completeness so the
  // generator can consistently decide to skip them.
  for (const m of chaptersTs.matchAll(/'([\w./-]+\/)'/g)) {
    anchors.add(m[1])
  }

  // MDX inline references: <SourceRef path="..." />
  const { readdir } = await import('node:fs/promises')
  for (const locale of ['zh', 'en']) {
    const dir = join(contentDir, locale)
    let files = []
    try {
      files = await readdir(dir)
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith('.mdx')) continue
      const text = await readFile(join(dir, f), 'utf8')
      for (const m of text.matchAll(/<SourceRef\s+path="([^"]+)"/g)) {
        anchors.add(m[1])
      }
    }
  }

  return [...anchors].sort()
}

export async function generateSourceSnippets({ silent = false } = {}) {
  const anchors = await collectAnchors()
  const snippets = {}
  let built = 0
  for (const anchor of anchors) {
    const snip = await buildSnippet(anchor)
    if (snip) {
      snippets[anchor] = snip
      built++
    }
  }

  const banner =
    '// GENERATED by scripts/gen-source-snippets.mjs — do not edit by hand.\n' +
    '// Snippets are fetched verbatim from the CloudWeGo eino* repos on GitHub,\n' +
    '// pinned to the commit SHAs in REPO_REFS, at build time.\n'

  const type = `export interface SourceSnippet {
  /** The original anchor, e.g. "adk/react.go:210". */
  anchor: string
  /** Repo-relative path shown on the chip, e.g. "adk/react.go". */
  path: string
  repo: 'eino' | 'eino-ext' | 'eino-examples'
  lang: string
  /** GitHub permalink to the exact file (and line). */
  href: string
  /** First line number shown in the snippet (1-based). */
  startLine: number
  /** Last line number shown (1-based, inclusive). */
  endLine: number
  /** The targeted line to emphasize, or null for a file-head preview. */
  focusLine: number | null
  /** Total line count of the source file. */
  totalLines: number
  /** Shiki dual-theme HTML for the windowed snippet. */
  html: string
}\n\n`

  const body =
    'export const SOURCE_SNIPPETS: Record<string, SourceSnippet> = ' +
    JSON.stringify(snippets, null, 2) +
    '\n'

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, banner + '\n' + type + body, 'utf8')

  if (!silent) {
    console.log(
      `[gen-source-snippets] ${built}/${anchors.length} anchors → ${OUT_FILE.replace(PROJECT_ROOT + '/', '')}`,
    )
  }
  return { built, total: anchors.length }
}

// Allow running directly: `node scripts/gen-source-snippets.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSourceSnippets().catch((err) => {
    console.error('[gen-source-snippets] failed:', err)
    process.exit(1)
  })
}
