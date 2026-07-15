# Eino by Mechanism · 以 ADK 为核心的可视化 Agent 教程

An interactive, mechanism-visualization tutorial site for the [CloudWeGo Eino](https://github.com/cloudwego/eino)
framework (v0.9), built with **TanStack Start + React + shadcn/ui**. The book is
ADK-centric: it teaches *using*, *designing*, and *implementing* the Agent
Development Kit first, then descends into the compose engine beneath it.

## Highlights

- **28-chapter outline across 5 parts**, ADK-first (see `src/content/chapters.ts`).
- **5 flagship interactive visualizations**, each grounded in real Eino source:
  - ReAct as a compiled graph (`adk/react.go`)
  - Agent-as-Tool vs Transfer (`adk/agent_tool.go`, `adk/interface.go`)
  - Runnable's four paradigms & auto-downgrade (`compose/runnable.go`)
  - Interrupt / Checkpoint / Resume (`compose/interrupt.go`, `checkpoint.go`, `resume.go`)
  - Fan-out / Fan-in parallelism (`compose/graph_run.go`, `compose/values_merge.go`)
- **Bilingual** (zh primary, en), **light/dark** themes, **fully static** output.
- MDX content with Shiki code highlighting and `<SourceRef>` deep-links into the
  upstream repos.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Build & preview (static)

```bash
pnpm build      # prerenders every locale + chapter into dist/client
pnpm serve      # preview the built site on http://localhost:4173
pnpm typecheck  # tsc --noEmit
```

The static site is emitted to `dist/client/` (59 pre-rendered HTML pages: 28
chapters × 2 locales + 2 landings + 1 root redirect). Deploy that folder to any
static host; the base path is `/`.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/content/chapters.ts` | Single source of truth: parts, chapters, viz bindings, source anchors |
| `src/content/{zh,en}/*.mdx` | Authored chapter prose |
| `src/content/registry.ts` | Resolves MDX for a locale + slug (falls back to placeholder) |
| `src/components/viz/` | Interactive visualizations + shared `useStepPlayer` / `VizStage` |
| `src/components/mdx/` | `<SourceRef>`, `<Callout>`, `<Viz>` — available in every chapter |
| `src/components/docs/` | Header, sidebar, TOC, pager |
| `src/routes/` | TanStack Start file routes (`/`, `/$locale`, `/$locale/chapters/$slug`) |

## Authoring a chapter

1. Set the chapter's `status: 'written'` in `src/content/chapters.ts`.
2. Create `src/content/zh/<slug>.mdx` (and `en/<slug>.mdx`).
3. Use `<Viz name="…" />`, `<SourceRef path="adk/react.go:210" />`, and
   `<Callout kind="key|note|tip|warning">` freely — no imports needed.

Chapters without an MDX file automatically render a structured placeholder that
lists the outline summary, source anchors, and any bound visualization.
