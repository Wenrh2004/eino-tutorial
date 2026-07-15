import { useStepPlayer } from './use-step-player'
import { VizStage } from './viz-stage'
import { ArrowDefs, GraphEdge, GraphNode, VizCanvas, type NodeState } from './graph-primitives'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

// Parallelism in compose has two ends, and this viz makes both literally move.
// Fan-OUT: one node's output must reach several downstreams — copyItem shares the
// *reference* for plain values (A and B get the same pointer) but copy-on-reads a
// stream into N independent readers (schema/stream.go). Fan-IN: several upstream
// outputs converge on one node — mergeValues key-unions maps (internal/merge.go)
// and interleaves streams by arrival order. The trigger mode decides *when* a
// fan-in node fires: Pregel runs on any arrival (compose/pregel.go), DAG waits for
// all predecessors and propagates skip (compose/dag.go). Packets travel the wires
// so readers see one value split into two, then two converge into one.

type NodeKey = 'src' | 'a' | 'b' | 'sink'
type PacketTone = 'value' | 'stream' | 'merged'
type Phase = 'fan-out' | 'fan-in' | 'gate'

// Edge indices: 0 = src→A, 1 = src→B, 2 = A→sink, 3 = B→sink.
interface StepDef {
  states: Partial<Record<NodeKey, NodeState>>
  activeEdges: number[]
  /** Packets that travel along an edge this step (edge index + label + color). */
  packets: { edge: number; label: string; tone: PacketTone }[]
  /** A single packet parked at the source output, before it splits. */
  originPacket?: { label: string; tone: PacketTone }
  phase: Phase
  dataFlow: {
    from: string
    to: string
    payload: string
    kind: 'value' | 'stream' | 'state' | 'control'
  }
  caption: { zh: string; en: string }
  inset?: 'value' | 'stream' | 'merge' | 'gate'
}

const STEPS: StepDef[] = [
  {
    states: { src: 'active', a: 'idle', b: 'idle', sink: 'idle' },
    activeEdges: [],
    packets: [],
    originPacket: { label: 'out', tone: 'value' },
    phase: 'fan-out',
    dataFlow: {
      from: 'source',
      to: 'A, B',
      payload: 'one output value · two out-edges waiting',
      kind: 'value',
    },
    caption: {
      zh: '起点:上游算出一份输出。它有两条出边,引擎必须把这一份同时送到 A 和 B——这就是「扇出」。往下看这份输出如何“分身”。',
      en: 'Start: the upstream produces one output. It has two out-edges, so the engine must deliver that single value to both A and B — this is fan-out. Watch how the value gets "cloned".',
    },
  },
  {
    states: { src: 'done', a: 'active', b: 'active', sink: 'idle' },
    activeEdges: [0, 1],
    packets: [
      { edge: 0, label: '&v', tone: 'value' },
      { edge: 1, label: '&v', tone: 'value' },
    ],
    phase: 'fan-out',
    inset: 'value',
    dataFlow: {
      from: 'copyItem',
      to: 'A, B',
      payload: '&v — same pointer handed to A and B (no deep copy)',
      kind: 'value',
    },
    caption: {
      zh: '扇出普通值:copyItem(graph_run.go:1020)不做深拷贝,把同一个引用 &v 塞给 A 和 B。看两个包裹标签一样——它们是同一个指针,所以下游切勿就地修改。',
      en: 'Fan-out of a plain value: copyItem (graph_run.go:1020) does no deep copy — it hands the same reference &v to A and B. Both packets carry the identical label because it is one pointer, so downstream must not mutate it in place.',
    },
  },
  {
    states: { src: 'done', a: 'active', b: 'active', sink: 'idle' },
    activeEdges: [0, 1],
    packets: [
      { edge: 0, label: 'SR[0]', tone: 'stream' },
      { edge: 1, label: 'SR[1]', tone: 'stream' },
    ],
    phase: 'fan-out',
    inset: 'stream',
    dataFlow: {
      from: 'stream.Copy(2)',
      to: 'A, B',
      payload: '2 independent StreamReaders · copy-on-read',
      kind: 'stream',
    },
    caption: {
      zh: '扇出流就不能共享了——流只能读一次。copyItem 改走 stream.Copy(schema/stream.go:837),裂成 N 个各自独立的 reader。它不复制数据:N 个副本共享一条单链表,谁先读到某个 chunk 谁负责缓存,其余沿链表跟读(copy-on-read)。',
      en: 'A stream cannot be shared — it reads only once. copyItem switches to stream.Copy (schema/stream.go:837), splitting it into N independent readers. No data is copied: the N copies share one singly-linked list, whichever reads a chunk first caches it, the rest follow along (copy-on-read).',
    },
  },
  {
    states: { src: 'done', a: 'done', b: 'done', sink: 'active' },
    activeEdges: [2, 3],
    packets: [
      { edge: 2, label: 'out_A', tone: 'merged' },
      { edge: 3, label: 'out_B', tone: 'merged' },
    ],
    phase: 'fan-in',
    inset: 'merge',
    dataFlow: {
      from: 'A, B',
      to: 'mergeValues',
      payload: 'maps → key-union · streams → by arrival order',
      kind: 'value',
    },
    caption: {
      zh: '另一端是「扇入」:A、B 的输出反向汇到同一个下游。两个包裹相向而行、合成一份——mergeValues(values_merge.go:39)按类型合并:map 取键并集(internal/merge.go:62,键冲突报错),多条流按到达序交错(stream.go:538)。',
      en: 'The other end is fan-in: the outputs of A and B travel back into one downstream. Two packets move toward each other and become one — mergeValues (values_merge.go:39) merges by type: maps take a key-union (internal/merge.go:62, a clash errors), multiple streams interleave by arrival order (stream.go:538).',
    },
  },
  {
    states: { src: 'done', a: 'done', b: 'done', sink: 'active' },
    activeEdges: [2, 3],
    packets: [],
    phase: 'gate',
    inset: 'gate',
    dataFlow: {
      from: 'trigger mode',
      to: 'fan-in node',
      payload: 'Pregel: fire on ANY arrival  vs  DAG: wait ALL + skip-propagate',
      kind: 'control',
    },
    caption: {
      zh: '最后一个问题:下游要等几个上游到齐才开跑?由触发模式拍板——Pregel(pregel.go:55)任一前驱到货就触发、允许环;DAG(dag.go:128)等齐所有前驱,且某上游被跳过时把 skip 沿边传播。Workflow 更细,靠 FieldMapping(field_mapping.go:31)做字段级扇入。',
      en: 'One last question: how many upstreams must arrive before the downstream runs? The trigger mode decides — Pregel (pregel.go:55) fires on any predecessor arrival and allows cycles; DAG (dag.go:128) waits for all predecessors and propagates skip along edges when one is skipped. Workflow is finer-grained, using FieldMapping (field_mapping.go:31) for field-level fan-in.',
    },
  },
]

// Fixed layout: src on the left, A/B stacked in the middle, sink on the right.
const POS: Record<NodeKey, { x: number; y: number }> = {
  src: { x: 70, y: 92 },
  a: { x: 250, y: 44 },
  b: { x: 250, y: 140 },
  sink: { x: 430, y: 92 },
}

// Edge geometry, index-aligned with StepDef.activeEdges / packets.
const EDGE_PATHS = [
  `M ${POS.src.x + 66} ${POS.src.y - 14} C 165 62, 185 44, ${POS.a.x - 66} ${POS.a.y}`, // 0 src→A
  `M ${POS.src.x + 66} ${POS.src.y + 14} C 165 122, 185 140, ${POS.b.x - 66} ${POS.b.y}`, // 1 src→B
  `M ${POS.a.x + 66} ${POS.a.y} C 345 44, 365 62, ${POS.sink.x - 66} ${POS.sink.y - 14}`, // 2 A→sink
  `M ${POS.b.x + 66} ${POS.b.y} C 345 140, 365 122, ${POS.sink.x - 66} ${POS.sink.y + 14}`, // 3 B→sink
]

const PACKET_FILL: Record<PacketTone, string> = {
  value: 'var(--color-viz-node-active)',
  stream: 'var(--color-primary)',
  merged: 'var(--color-viz-node-done)',
}

/**
 * A labeled packet that continuously travels along an edge path via SVG
 * animateMotion, so fan-out reads as "one value splits into two travelers" and
 * fan-in reads as "two travelers converge into one". Re-keyed per step so the
 * motion restarts cleanly when the step changes.
 */
function TravelingPacket({
  d,
  label,
  tone,
}: {
  d: string
  label: string
  tone: PacketTone
}) {
  const w = Math.max(30, label.length * 6.6 + 14)
  return (
    <g>
      <rect
        x={-w / 2}
        y={-9}
        width={w}
        height={18}
        rx={9}
        fill={PACKET_FILL[tone]}
        stroke="var(--color-background)"
        strokeWidth={1.25}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9.5}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="oklch(0.99 0.01 200)"
      >
        {label}
      </text>
      <animateMotion dur="1.8s" repeatCount="indefinite" rotate="0" path={d} />
    </g>
  )
}

/** A packet parked at the source output, gently pulsing before it splits. */
function OriginPacket({ label, tone }: { label: string; tone: PacketTone }) {
  const w = Math.max(30, label.length * 6.6 + 14)
  return (
    <g transform={`translate(${POS.src.x + 92} ${POS.src.y})`}>
      <rect
        x={-w / 2}
        y={-9}
        width={w}
        height={18}
        rx={9}
        fill={PACKET_FILL[tone]}
        stroke="var(--color-background)"
        strokeWidth={1.25}
      >
        <animate attributeName="opacity" values="0.65;1;0.65" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9.5}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="oklch(0.99 0.01 200)"
      >
        {label}
      </text>
    </g>
  )
}

const PHASE_LABEL: Record<Phase, { zh: string; en: string; x: number; tone: string }> = {
  'fan-out': { zh: '扇出 · fan-out', en: 'fan-out', x: 160, tone: 'var(--color-viz-node-active)' },
  'fan-in': { zh: '扇入 · fan-in', en: 'fan-in', x: 340, tone: 'var(--color-viz-node-done)' },
  gate: { zh: '触发门控 · gating', en: 'gating', x: 250, tone: 'var(--color-viz-danger)' },
}

function Inset({ kind, locale }: { kind: NonNullable<StepDef['inset']>; locale: Locale }) {
  const zh = locale === 'zh'
  if (kind === 'value') {
    return (
      <InsetFrame title={zh ? '值:共享同一引用' : 'value: one shared reference'}>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <Chip tone="value">&v</Chip>
          <span className="text-muted-foreground">copyItem →</span>
          <div className="flex flex-col gap-1">
            <Chip tone="node">A · &v</Chip>
            <Chip tone="node">B · &v</Chip>
          </div>
          <span className="text-muted-foreground ml-1">
            {zh ? '同一指针 · 勿就地改' : 'same pointer · do not mutate'}
          </span>
        </div>
      </InsetFrame>
    )
  }
  if (kind === 'stream') {
    return (
      <InsetFrame title={zh ? '流:Copy 成 N 个 reader,共享单链表' : 'stream: Copy into N readers over one linked list'}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            {['c0', 'c1', 'c2'].map((c, i) => (
              <span key={c} className="flex items-center gap-1.5">
                <Chip tone="stream">{c}</Chip>
                {i < 2 && <span className="text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
          <span className="text-muted-foreground">
            {zh ? '游标 A@c1 · 游标 B@c0 · 谁先读谁缓存' : 'cursor A@c1 · cursor B@c0 · first reader caches'}
          </span>
        </div>
      </InsetFrame>
    )
  }
  if (kind === 'merge') {
    return (
      <InsetFrame title={zh ? 'mergeValues:按类型合并' : 'mergeValues: merge by type'}>
        <div className="flex flex-col gap-1 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Chip tone="value">{'{a:1}'}</Chip>
            <span className="text-muted-foreground">+</span>
            <Chip tone="value">{'{b:2}'}</Chip>
            <span className="text-muted-foreground">→</span>
            <Chip tone="done">{'{a:1,b:2}'}</Chip>
            <span className="text-muted-foreground">{zh ? '键并集 · 冲突报错' : 'key-union · clash errors'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Chip tone="stream">SR·A</Chip>
            <span className="text-muted-foreground">⨝</span>
            <Chip tone="stream">SR·B</Chip>
            <span className="text-muted-foreground">→</span>
            <Chip tone="done">multiStreamReader</Chip>
            <span className="text-muted-foreground">{zh ? '按到达序' : 'by arrival'}</span>
          </div>
        </div>
      </InsetFrame>
    )
  }
  // gate
  return (
    <InsetFrame title={zh ? '触发模式:下游何时开跑' : 'trigger mode: when the fan-in node runs'}>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="border-viz-node-done/50 bg-viz-node-done/10 rounded-md border p-2">
          <p className="font-mono font-semibold">Pregel</p>
          <p className="text-muted-foreground mt-0.5">
            {zh ? '任一前驱到达即触发 · 支持环' : 'any predecessor arrives → fire · cycles OK'}
          </p>
        </div>
        <div className="border-primary/50 bg-primary/10 rounded-md border p-2">
          <p className="font-mono font-semibold">DAG</p>
          <p className="text-muted-foreground mt-0.5">
            {zh ? '等齐所有前驱 · skip 沿边传播' : 'wait all predecessors · skip propagates'}
          </p>
        </div>
      </div>
    </InsetFrame>
  )
}

function InsetFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-lg border border-dashed p-3">
      <p className="text-muted-foreground mb-2 text-[11px] font-medium">{title}</p>
      {children}
    </div>
  )
}

function Chip({
  tone,
  children,
}: {
  tone: 'value' | 'stream' | 'state' | 'done' | 'node'
  children: React.ReactNode
}) {
  const cls: Record<string, string> = {
    value: 'bg-viz-node-active/12 text-viz-node-active',
    stream: 'bg-primary/12 text-primary',
    state: 'bg-viz-node-done/15 text-viz-node-done',
    done: 'bg-viz-node-done/15 text-viz-node-done',
    node: 'bg-muted text-foreground',
  }
  return (
    <span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px] font-medium', cls[tone])}>
      {children}
    </span>
  )
}

export function FanInFanOutViz({ locale }: { locale: Locale }) {
  const player = useStepPlayer({ count: STEPS.length, intervalMs: 2600 })
  const s = STEPS[player.step]!
  const zh = locale === 'zh'

  const stepLabels = zh
    ? ['产出', '扇出·值', '扇出·流', '扇入·合并', '门控']
    : ['produce', 'fan-out · value', 'fan-out · stream', 'fan-in · merge', 'gating']

  const phase = PHASE_LABEL[s.phase]

  return (
    <VizStage
      locale={locale}
      title={zh ? '扇出与扇入:并行的两端' : 'Fan-Out and Fan-In: both ends of parallelism'}
      player={player}
      total={STEPS.length}
      caption={s.caption[locale]}
      dataFlow={s.dataFlow}
      stepLabels={stepLabels}
    >
      <div className="flex flex-col gap-4">
        <VizCanvas viewBox="0 0 500 190">
          <ArrowDefs />

          {/* Phase banner: names which end of parallelism this step is on. */}
          <text
            x={phase.x}
            y={16}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={phase.tone}
            style={{ transition: 'fill 0.35s' }}
          >
            {phase[locale]}
          </text>

          {EDGE_PATHS.map((d, i) => (
            <GraphEdge key={i} d={d} active={s.activeEdges.includes(i)} />
          ))}

          <GraphNode
            x={POS.src.x}
            y={POS.src.y}
            label={zh ? '上游' : 'source'}
            sub={zh ? '产出' : 'produce'}
            state={s.states.src}
          />
          <GraphNode
            x={POS.a.x}
            y={POS.a.y}
            label="A"
            sub={zh ? '分支' : 'branch'}
            state={s.states.a}
          />
          <GraphNode
            x={POS.b.x}
            y={POS.b.y}
            label="B"
            sub={zh ? '分支' : 'branch'}
            state={s.states.b}
          />
          <GraphNode
            x={POS.sink.x}
            y={POS.sink.y}
            label={zh ? '扇入节点' : 'fan-in'}
            sub="mergeValues"
            state={s.states.sink}
          />

          {/* Parked packet (produce step), then travelers on the active edges. */}
          {s.originPacket && <OriginPacket label={s.originPacket.label} tone={s.originPacket.tone} />}
          {s.packets.map((p, i) => (
            <TravelingPacket
              key={`${player.step}-${i}`}
              d={EDGE_PATHS[p.edge]!}
              label={p.label}
              tone={p.tone}
            />
          ))}
        </VizCanvas>

        {s.inset && <Inset kind={s.inset} locale={locale} />}
      </div>
    </VizStage>
  )
}
