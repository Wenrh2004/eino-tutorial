import type { ReactNode } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { StepPlayer } from './use-step-player'

interface VizStageProps {
  locale: Locale
  title: ReactNode
  player: StepPlayer
  /** Total steps, for the "Step N / M" readout. */
  total: number
  /** The caption describing the current step. */
  caption: ReactNode
  /** The visual body (diagram, timeline, etc.). */
  children: ReactNode
  /**
   * Optional data-flow inspector shown beside the caption: the concrete payload
   * currently "on the wire" for this step. Makes data movement explicit.
   */
  dataFlow?: {
    from: string
    to: string
    payload: ReactNode
    kind?: 'value' | 'stream' | 'state' | 'control'
  } | null
  /** Optional dot-jump labels; falls back to numeric dots. */
  stepLabels?: string[]
  className?: string
}

/**
 * Chrome shared by every interactive visualization: a titled frame, the
 * diagram area, a transport bar (reset / prev / play / next), a step readout,
 * jump dots, and the step caption. Individual visualizations only supply the
 * diagram body plus per-step captions.
 */
export function VizStage({
  locale,
  title,
  player,
  total,
  caption,
  children,
  dataFlow,
  stepLabels,
  className,
}: VizStageProps) {
  return (
    <figure
      className={cn(
        'not-prose bg-card my-8 overflow-hidden rounded-xl border shadow-sm',
        className,
      )}
    >
      <figcaption className="bg-muted/50 flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {t(locale, 'viz.step')} {player.step + 1} / {total}
        </span>
      </figcaption>

      <div className="relative min-h-[280px] p-4 sm:p-6">{children}</div>

      {dataFlow && <WireInspector locale={locale} {...dataFlow} />}

      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={player.reset}
            disabled={player.atStart && !player.isPlaying}
            aria-label={t(locale, 'viz.reset')}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={player.prev}
            disabled={player.atStart}
            aria-label={t(locale, 'viz.prev')}
          >
            <SkipBack />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={player.toggle}
            aria-label={player.isPlaying ? t(locale, 'viz.pause') : t(locale, 'viz.play')}
          >
            {player.isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={player.next}
            disabled={player.atEnd}
            aria-label={t(locale, 'viz.next')}
          >
            <SkipForward />
          </Button>

          <div className="ml-2 flex flex-1 flex-wrap items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => player.goTo(i)}
                title={stepLabels?.[i] ?? `${i + 1}`}
                aria-label={stepLabels?.[i] ?? `${t(locale, 'viz.step')} ${i + 1}`}
                className={cn(
                  'size-2.5 rounded-full transition-colors',
                  i === player.step
                    ? 'bg-primary'
                    : i < player.step
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/25 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        </div>

        <p className="text-muted-foreground mt-3 min-h-[2.5rem] text-sm leading-relaxed">
          {caption}
        </p>
      </div>
    </figure>
  )
}

/** Visual metadata per payload kind, so readers learn the vocabulary by color. */
const KIND_META: Record<
  NonNullable<NonNullable<VizStageProps['dataFlow']>['kind']>,
  { zh: string; en: string; className: string }
> = {
  value: { zh: '单值', en: 'value', className: 'bg-viz-node-active/12 text-viz-node-active' },
  stream: { zh: '流', en: 'stream', className: 'bg-primary/12 text-primary' },
  state: { zh: '状态', en: 'state', className: 'bg-viz-node-done/15 text-viz-node-done' },
  control: { zh: '控制流', en: 'control', className: 'bg-viz-danger/12 text-viz-danger' },
}

/**
 * A strip below the diagram that spells out the *concrete* data currently moving
 * between two nodes: `from → to` plus the payload itself. This is the piece that
 * makes "data flow" legible rather than implied by a glowing edge.
 */
function WireInspector({
  locale,
  from,
  to,
  payload,
  kind = 'value',
}: {
  locale: Locale
  from: string
  to: string
  payload: ReactNode
  kind?: NonNullable<NonNullable<VizStageProps['dataFlow']>['kind']>
}) {
  const meta = KIND_META[kind]
  return (
    <div className="bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2.5 text-xs">
      <span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px] font-medium', meta.className)}>
        {meta[locale]}
      </span>
      <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono">
        <span className="text-foreground font-semibold">{from}</span>
        <span aria-hidden>→</span>
        <span className="text-foreground font-semibold">{to}</span>
      </span>
      <code className="bg-card text-foreground min-w-0 flex-1 truncate rounded border px-2 py-1 font-mono text-[11px]">
        {payload}
      </code>
    </div>
  )
}
