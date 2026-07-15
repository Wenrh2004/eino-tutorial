import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { ArrowRight, Boxes, GitFork, Layers, Pause } from 'lucide-react'
import { isLocale, t } from '@/lib/i18n'
import { PARTS } from '@/content/chapters'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/$locale/')({
  component: LandingPage,
})

// The four "design threads" — the recurring ideas the whole book returns to.
const THREADS = [
  {
    icon: Layers,
    title: { zh: 'Agent 即事件流生成器', en: 'Agent = event-stream generator' },
    body: {
      zh: '每个 Agent 只做一件事：把输入变成一串事件。统一的 TypedAgent[M] 抽象让单体、工具化、多智能体共用一套运行时。',
      en: 'Every agent does one thing: turn input into a stream of events. One TypedAgent[M] abstraction unifies solo, tool-wrapped and multi-agent runtimes.',
    },
  },
  {
    icon: GitFork,
    title: { zh: '组合优于跳转', en: 'Composition over jumping' },
    body: {
      zh: 'agent-as-tool 用隔离的 session 把子 Agent 变成可组合的工具；共享 session 的 transfer 被官方标注 NOT RECOMMENDED。',
      en: 'agent-as-tool turns sub-agents into composable tools with isolated sessions; shared-session transfer is flagged NOT RECOMMENDED.',
    },
  },
  {
    icon: Pause,
    title: { zh: '中断是一等公民', en: 'Interrupts are first-class' },
    body: {
      zh: '中断/checkpoint/续跑内建在编排引擎里，向上冒泡穿过整棵调用树。人在回路不是补丁，而是机制。',
      en: 'Interrupt/checkpoint/resume are built into the engine and bubble through the whole call tree. HITL is a mechanism, not a patch.',
    },
  },
  {
    icon: Boxes,
    title: { zh: '一次实现，四种范式', en: 'Implement once, four paradigms' },
    body: {
      zh: 'Runnable 的 Invoke/Stream/Collect/Transform 由框架自动降级适配，流式与非流式无需重复实现。',
      en: 'Runnable’s Invoke/Stream/Collect/Transform auto-downgrade, so streaming and non-streaming need only one implementation.',
    },
  },
]

function LandingPage() {
  const { locale } = useParams({ from: '/$locale' })
  if (!isLocale(locale)) return null

  const firstChapter = PARTS[0]?.chapters[0]
  const totalChapters = PARTS.reduce((n, p) => n + p.chapters.length, 0)

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero. */}
      <section className="py-8 sm:py-12">
        <Badge variant="secondary" className="mb-4 font-mono">
          {t(locale, 'landing.hero.badge')}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t(locale, 'site.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">{t(locale, 'site.tagline')}</p>
        <p className="text-foreground/80 mt-6 max-w-2xl text-base leading-relaxed">
          {t(locale, 'landing.hero.lead')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {firstChapter && (
            <Button asChild size="lg">
              <Link to="/$locale/chapters/$slug" params={{ locale, slug: firstChapter.slug }}>
                {t(locale, 'landing.cta')}
                <ArrowRight />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <a href="https://github.com/cloudwego/eino" target="_blank" rel="noreferrer">
              {t(locale, 'landing.hero.ctaSources')}
            </a>
          </Button>
        </div>
      </section>

      {/* Design threads. */}
      <section className="py-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'landing.threads.title')}
        </h2>
        <p className="text-muted-foreground mt-1">{t(locale, 'landing.threads.subtitle')}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {THREADS.map((thread) => {
            const Icon = thread.icon
            return (
              <Card key={thread.title.en} className="gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{thread.title[locale]}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {thread.body[locale]}
                </p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Outline. */}
      <section className="py-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t(locale, 'landing.outline.title')}
          </h2>
          <span className="text-muted-foreground text-sm">
            {t(locale, 'landing.chapterCount', { n: totalChapters })}
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          {PARTS.map((part, i) => (
            <Card key={part.id} className="gap-0 p-0">
              <div className="flex flex-col gap-1 border-b p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-md font-mono text-sm font-bold',
                      i < 3
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{part.title[locale]}</h3>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{part.intro[locale]}</p>
              </div>
              <ul className="divide-y">
                {part.chapters.map((c) => (
                  <li key={c.slug}>
                    <Link
                      to="/$locale/chapters/$slug"
                      params={{ locale, slug: c.slug }}
                      className="hover:bg-muted/50 group flex items-center gap-3 px-5 py-2.5 transition-colors"
                    >
                      <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs tabular-nums">
                        {c.number}
                      </span>
                      <span className="flex-1 text-sm group-hover:text-primary">
                        {c.title[locale]}
                      </span>
                      {c.viz && (
                        <Badge variant="secondary" className="text-[10px]">
                          VIZ
                        </Badge>
                      )}
                      {c.status === 'written' && (
                        <Badge variant="success" className="text-[10px]">
                          {t(locale, 'status.written')}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
