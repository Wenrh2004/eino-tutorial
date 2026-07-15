import { useStepPlayer } from './use-step-player'
import { VizStage } from './viz-stage'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

// Runnable[I,O] exposes four methods — Invoke / Stream / Collect / Transform —
// spanning the {single, stream} x {input, output} matrix. A component only
// implements what it can; compose *auto-generates* the rest by wrapping with two
// primitives: StreamReaderFromArray (box a single value into a 1-element stream)
// and concatStreamReader (fold a stream back into one value). This viz shows,
// for a caller-requested paradigm, how the framework downgrades to the one real
// implementation and adapts the edges.

type Paradigm = 'invoke' | 'stream' | 'collect' | 'transform'

const PARADIGMS: { id: Paradigm; in: 'single' | 'stream'; out: 'single' | 'stream'; sig: string }[] = [
  { id: 'invoke', in: 'single', out: 'single', sig: 'Invoke(I) → O' },
  { id: 'stream', in: 'single', out: 'stream', sig: 'Stream(I) → StreamReader[O]' },
  { id: 'collect', in: 'stream', out: 'single', sig: 'Collect(StreamReader[I]) → O' },
  { id: 'transform', in: 'stream', out: 'stream', sig: 'Transform(SR[I]) → SR[O]' },
]

interface Step {
  requested: Paradigm
  /** The single method the component actually implements. */
  impl: Paradigm
  /** Whether input must be boxed / concatenated to fit impl. */
  inAdapt: 'none' | 'box' | 'concat'
  outAdapt: 'none' | 'box' | 'concat'
  /** Concrete example payload as it enters and leaves, for the data inspector. */
  example: { in: string; out: string }
  caption: { zh: string; en: string }
}

const STEPS: Step[] = [
  {
    requested: 'invoke',
    impl: 'invoke',
    inAdapt: 'none',
    outAdapt: 'none',
    example: { in: '"hi"', out: 'Msg{"hello"}' },
    caption: {
      zh: '组件原生实现了 Invoke（单入单出）。调用方要 Invoke，直接命中，无需适配。',
      en: 'The component natively implements Invoke (single→single). The caller asks for Invoke — a direct hit, no adaptation.',
    },
  },
  {
    requested: 'stream',
    impl: 'invoke',
    inAdapt: 'none',
    outAdapt: 'box',
    example: { in: '"hi"', out: 'StreamReader[Msg{"hello"}]' },
    caption: {
      zh: '调用方要 Stream，但组件只有 Invoke。框架先执行 Invoke 得到单值，再用 StreamReaderFromArray 把它“装箱”成单元素流。',
      en: 'Caller wants Stream but only Invoke exists. The framework runs Invoke, then boxes the single value into a 1-element stream via StreamReaderFromArray.',
    },
  },
  {
    requested: 'collect',
    impl: 'invoke',
    inAdapt: 'concat',
    outAdapt: 'none',
    example: { in: 'SR["h","i"]', out: 'Msg{"hello"}' },
    caption: {
      zh: '调用方要 Collect（流入单出）。框架用 concatStreamReader 把输入流“拼接”成单值，喂给 Invoke。',
      en: 'Caller wants Collect (stream→single). The framework folds the input stream into one value via concatStreamReader, then feeds Invoke.',
    },
  },
  {
    requested: 'transform',
    impl: 'invoke',
    inAdapt: 'concat',
    outAdapt: 'box',
    example: { in: 'SR["h","i"]', out: 'SR[Msg{"hello"}]' },
    caption: {
      zh: '最极端：调用方要 Transform（流入流出），组件只有 Invoke。输入先 concat 成单值，Invoke 后再 box 成流——一条实现撑起四种范式。',
      en: 'Extreme case: caller wants Transform (stream→stream) but only Invoke exists. Input is concat’d to a single value, then output is boxed back to a stream — one implementation powers all four paradigms.',
    },
  },
  {
    requested: 'transform',
    impl: 'transform',
    inAdapt: 'none',
    outAdapt: 'none',
    example: { in: 'SR["h","i"]', out: 'SR["he","llo"]' },
    caption: {
      zh: '反过来，若组件原生实现了 Transform，则它能“降级”服务其余三种范式——Transform 是能力最强的实现点。',
      en: 'Conversely, a component that natively implements Transform can serve the other three by downgrading — Transform is the most capable implementation point.',
    },
  },
]

function AdaptBadge({ kind, locale }: { kind: 'none' | 'box' | 'concat'; locale: Locale }) {
  if (kind === 'none')
    return <span className="text-muted-foreground text-xs">{locale === 'zh' ? '直连' : 'direct'}</span>
  const label =
    kind === 'box'
      ? locale === 'zh'
        ? '装箱 (StreamReaderFromArray)'
        : 'box (StreamReaderFromArray)'
      : locale === 'zh'
        ? '拼接 (concatStreamReader)'
        : 'concat (concatStreamReader)'
  return (
    <span className="bg-primary/12 text-primary rounded px-1.5 py-0.5 font-mono text-[11px]">
      {label}
    </span>
  )
}

function Pipe({ mode }: { mode: 'single' | 'stream' }) {
  return mode === 'single' ? (
    <div className="bg-viz-node-active size-3 rounded-full" title="single value" />
  ) : (
    <div className="flex gap-0.5" title="stream">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-viz-node-active h-3 w-1 rounded-sm" />
      ))}
    </div>
  )
}

export function RunnableParadigmViz({ locale }: { locale: Locale }) {
  const player = useStepPlayer({ count: STEPS.length, intervalMs: 2000 })
  const s = STEPS[player.step]!
  const reqDef = PARADIGMS.find((p) => p.id === s.requested)!
  const implDef = PARADIGMS.find((p) => p.id === s.impl)!

  return (
    <VizStage
      locale={locale}
      title={locale === 'zh' ? 'Runnable 四范式自动适配' : 'Runnable: four paradigms, auto-adapted'}
      player={player}
      total={STEPS.length}
      caption={s.caption[locale]}
      dataFlow={{
        from: `${s.requested}() in`,
        to: `${s.requested}() out`,
        payload: `${s.example.in}  ⇒  ${implDef.id}()  ⇒  ${s.example.out}`,
        kind: reqDef.in === 'stream' || reqDef.out === 'stream' ? 'stream' : 'value',
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Matrix of the four paradigms; highlight requested & impl. */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {PARADIGMS.map((p) => {
            const isReq = p.id === s.requested
            const isImpl = p.id === s.impl
            return (
              <div
                key={p.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isImpl
                    ? 'border-viz-node-done bg-viz-node-done/10'
                    : isReq
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-muted/30',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold capitalize">{p.id}</span>
                  <div className="flex gap-1">
                    {isReq && (
                      <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                        {locale === 'zh' ? '请求' : 'requested'}
                      </span>
                    )}
                    {isImpl && (
                      <span className="bg-viz-node-done rounded px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {locale === 'zh' ? '实现' : 'impl'}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-[11px]">{p.sig}</p>
              </div>
            )
          })}
        </div>

        {/* Adaptation pipeline: input → [concat?] → impl → [box?] → output. */}
        <div className="bg-muted/30 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-dashed p-4 text-sm">
          <div className="flex flex-col items-center gap-1">
            <Pipe mode={reqDef.in} />
            <span className="text-muted-foreground text-[11px]">
              {locale === 'zh' ? '调用方输入' : 'caller in'}
            </span>
            <code className="bg-card rounded border px-1.5 py-0.5 font-mono text-[10px]">
              {s.example.in}
            </code>
          </div>
          <span className="text-muted-foreground">→</span>
          <AdaptBadge kind={s.inAdapt} locale={locale} />
          <span className="text-muted-foreground">→</span>
          <div className="border-viz-node-done bg-viz-node-done/10 flex flex-col items-center gap-1 rounded-md border px-3 py-1.5">
            <span className="font-mono text-xs font-semibold capitalize">{implDef.id}</span>
            <span className="text-muted-foreground text-[10px]">
              {locale === 'zh' ? '真实实现' : 'real impl'}
            </span>
          </div>
          <span className="text-muted-foreground">→</span>
          <AdaptBadge kind={s.outAdapt} locale={locale} />
          <span className="text-muted-foreground">→</span>
          <div className="flex flex-col items-center gap-1">
            <Pipe mode={reqDef.out} />
            <span className="text-muted-foreground text-[11px]">
              {locale === 'zh' ? '调用方输出' : 'caller out'}
            </span>
            <code className="bg-card rounded border px-1.5 py-0.5 font-mono text-[10px]">
              {s.example.out}
            </code>
          </div>
        </div>
      </div>
    </VizStage>
  )
}
