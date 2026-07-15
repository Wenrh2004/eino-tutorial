import { useStepPlayer } from './use-step-player'
import { VizStage } from './viz-stage'
import { VizCanvas, ArrowDefs, GraphNode, GraphEdge, FlowPacket, type NodeState } from './graph-primitives'
import type { Locale } from '@/lib/i18n'

// Interrupt / Checkpoint / Resume, drawn as ONE picture so the two "flows" a
// reader has to connect are literally connected:
//   • the HORIZONTAL wire = the run/control flow across the graph's nodes
//   • the VERTICAL wire    = the SAME run state being serialized down to a
//                            checkpoint and later rehydrated back up
// Both meet at the interrupting node (the approval tool), which is the whole
// point: a run pauses *at a node*, its state is saved *from that node*, and it
// resumes *into that node*. Names are concrete (ChatModel / ApprovalTool / Apply
// / Reply) instead of N1..N4 so Chapter 5's HITL story is self-evident.

type Phase = 'run' | 'interrupt' | 'persist' | 'wait' | 'resume' | 'continue' | 'done'
type NodeId = 'model' | 'tool' | 'apply' | 'reply'
type Kind = 'value' | 'stream' | 'state' | 'control'

interface Step {
  phase: Phase
  /** Short pill gliding on the active wire. */
  wire: string
  /** Which wire the packet rides: a run edge, or the vertical checkpoint wire. */
  track: { kind: 'edge'; from: NodeId; to: NodeId } | { kind: 'down' } | { kind: 'up' } | { kind: 'rest' }
  /** Full annotation for the data-flow inspector (uses the same node names). */
  flow: { from: string; to: string; payload: string; kind: Kind }
  caption: { zh: string; en: string }
}

const STEPS: Step[] = [
  {
    phase: 'run',
    wire: '[]Message',
    track: { kind: 'edge', from: 'model', to: 'tool' },
    flow: { from: 'ChatModel', to: 'ApprovalTool', payload: 'channel: assistant 决定调用 approve(refund:￥500)', kind: 'value' },
    caption: {
      zh: '图正常执行：数据沿横向的 channel 在节点间流动。ChatModel 决定调用「审批工具」，把参数交给它。',
      en: 'The graph runs normally: data flows left-to-right across channels. ChatModel decides to call the approval tool and passes it the args.',
    },
  },
  {
    phase: 'interrupt',
    wire: 'Interrupt ↯',
    track: { kind: 'rest' },
    flow: { from: 'ApprovalTool', to: '(engine)', payload: 'raise Interrupt{ Address:"ApprovalTool", Info } —— 不是 error', kind: 'control' },
    caption: {
      zh: 'ApprovalTool 需要人工审批，于是抛出 Interrupt / StatefulInterrupt。这不是错误，而是「合法暂停」——运行停在这个节点上。',
      en: 'ApprovalTool needs a human, so it raises Interrupt / StatefulInterrupt — not an error but a *legal pause*. The run stops *at this node*.',
    },
  },
  {
    phase: 'persist',
    wire: 'gob bytes ↓',
    track: { kind: 'down' },
    flow: { from: 'ApprovalTool', to: 'CheckPoint', payload: 'gob.Encode{ channels, node states, Address:"ApprovalTool" }', kind: 'state' },
    caption: {
      zh: '纵向的另一条流：引擎把「整轮运行状态」（channel 值 + 各节点 state）用 gob 序列化，连同定位用的 Address 向下写入 CheckPoint。',
      en: 'The other, vertical flow: the engine gob-serializes the whole run state (channel values + per-node state) and writes it *down* into the CheckPoint, tagged with the Address of where it paused.',
    },
  },
  {
    phase: 'wait',
    wire: 'bytes at rest',
    track: { kind: 'rest' },
    flow: { from: 'CheckPoint', to: '(disk)', payload: 'process 可安全退出；等待人工审批', kind: 'state' },
    caption: {
      zh: '状态已落盘，进程可以安全退出。用户去审批、补参数、或隔天再回来——CheckPoint 静静等待，运行不占用任何资源。',
      en: 'State is on disk; the process can safely exit. The user approves, edits args, or comes back tomorrow — the CheckPoint just waits, holding no resources.',
    },
  },
  {
    phase: 'resume',
    wire: 'restore ↑',
    track: { kind: 'up' },
    flow: { from: 'CheckPoint', to: 'ApprovalTool', payload: 'gob.Decode ⇒ 还原 channels+states，回到 Address:"ApprovalTool"', kind: 'state' },
    caption: {
      zh: 'Resume(id) / ResumeWithData：按 Address 找回中断点，从 CheckPoint 反序列化，把整轮状态向上还原到当初暂停的那个节点。',
      en: 'Resume(id) / ResumeWithData: use the Address to find the pause point, deserialize from the CheckPoint, and restore the whole run state *back up* into the node that paused.',
    },
  },
  {
    phase: 'continue',
    wire: 'approved',
    track: { kind: 'edge', from: 'tool', to: 'apply' },
    flow: { from: 'ApprovalTool', to: 'Apply', payload: 'inject ResumeWithData("approved") ⇒ 工具返回，横向流继续', kind: 'value' },
    caption: {
      zh: '把审批结果注入到那个节点，横向的 run flow 从断点无缝继续——仿佛从未暂停。这就是纵向 checkpoint 与横向 run 在同一个节点“接上了”。',
      en: 'The approval is injected into that node and the horizontal run flow continues seamlessly — as if it never paused. This is where the vertical checkpoint flow and the horizontal run flow reconnect, at the very same node.',
    },
  },
  {
    phase: 'done',
    wire: 'final reply',
    track: { kind: 'edge', from: 'apply', to: 'reply' },
    flow: { from: 'Apply', to: 'Reply', payload: 'return final AssistantMessage', kind: 'value' },
    caption: {
      zh: '运行完成。中断/续跑是编排引擎的一等公民，ADK 的 HITL 正是继承了这套机制（BatchResumeWithData 还能一次恢复多个中断）。',
      en: 'Run complete. Interrupt/resume is a first-class engine feature; the ADK’s HITL inherits it directly (BatchResumeWithData can even resume many interrupts at once).',
    },
  },
]

const PHASE_ORDER: Phase[] = ['run', 'interrupt', 'persist', 'wait', 'resume', 'continue', 'done']

// Horizontal run track + a checkpoint store directly below the interrupting node.
const POS: Record<NodeId, { x: number; y: number }> = {
  model: { x: 110, y: 66 },
  tool: { x: 305, y: 66 },
  apply: { x: 500, y: 66 },
  reply: { x: 665, y: 66 },
}
const CP = { x: 305, y: 205, w: 210, h: 54 }

const LABEL: Record<NodeId, { label: string; sub: Record<Locale, string> }> = {
  model: { label: 'ChatModel', sub: { zh: '决策', en: 'plan' } },
  tool: { label: 'ApprovalTool', sub: { zh: '中断点', en: 'pause point' } },
  apply: { label: 'Apply', sub: { zh: '执行审批', en: 'apply' } },
  reply: { label: 'Reply', sub: { zh: '输出', en: 'output' } },
}

function toneOf(kind: Kind): 'active' | 'done' | 'danger' {
  return kind === 'control' ? 'danger' : kind === 'state' ? 'done' : 'active'
}

export function CheckpointResumeViz({ locale }: { locale: Locale }) {
  const player = useStepPlayer({ count: STEPS.length, intervalMs: 2000 })
  const s = STEPS[player.step]!
  const cur = PHASE_ORDER.indexOf(s.phase)

  // Node coloring per phase.
  const nodeState = (id: NodeId): NodeState => {
    const order: NodeId[] = ['model', 'tool', 'apply', 'reply']
    const idx = order.indexOf(id)
    if (id === 'tool') {
      if (s.phase === 'interrupt' || s.phase === 'persist' || s.phase === 'wait') return 'danger'
      if (s.phase === 'resume') return 'active'
      if (cur > PHASE_ORDER.indexOf('resume')) return 'done'
      if (s.phase === 'run') return 'idle'
    }
    if (s.phase === 'run') return id === 'model' ? 'active' : 'idle'
    if (s.phase === 'continue') return id === 'apply' ? 'active' : idx < 2 ? 'done' : 'idle'
    if (s.phase === 'done') return 'done'
    // interrupt/persist/wait/resume: everything before the tool is done.
    return idx < 1 ? 'done' : 'idle'
  }

  const cpExists = cur >= PHASE_ORDER.indexOf('persist')
  const cpGlow = s.phase === 'persist' || s.phase === 'resume'

  // Endpoints for the vertical checkpoint wire (tool bottom ↔ checkpoint top).
  const vTop = { x: POS.tool.x, y: POS.tool.y + 23 }
  const vBot = { x: CP.x, y: CP.y - CP.h / 2 }

  // Where the traveling packet sits this step.
  const packet = (() => {
    const tone = toneOf(s.flow.kind)
    if (s.track.kind === 'edge') {
      return { from: POS[s.track.from], to: POS[s.track.to], progress: 0.5, tone }
    }
    if (s.track.kind === 'down') return { from: vTop, to: vBot, progress: 0.5, tone }
    if (s.track.kind === 'up') return { from: vBot, to: vTop, progress: 0.5, tone }
    return null // 'rest' → no gliding packet (interrupt pulse / waiting)
  })()

  return (
    <VizStage
      locale={locale}
      title={locale === 'zh' ? '中断 · Checkpoint · 续跑' : 'Interrupt · Checkpoint · Resume'}
      player={player}
      total={STEPS.length}
      caption={s.caption[locale]}
      dataFlow={s.flow}
    >
      <div className="flex flex-col gap-4">
        {/* Phase ribbon. */}
        <div className="flex flex-wrap gap-1.5">
          {PHASE_ORDER.map((p, i) => (
            <div
              key={p}
              className={
                'rounded-md px-2 py-1 font-mono text-[11px] transition-colors ' +
                (i === cur
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : i < cur
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground')
              }
            >
              {p}
            </div>
          ))}
        </div>

        <VizCanvas viewBox="0 0 740 260">
          <ArrowDefs />

          {/* Axis captions so the two flows are named. */}
          <text x={16} y={40} fontSize={11} fontWeight={600} fill="var(--color-muted-foreground)">
            {locale === 'zh' ? '① 横向：run flow（控制流沿节点前进）' : '① Horizontal: run flow (control across nodes)'}
          </text>
          <text x={430} y={150} fontSize={11} fontWeight={600} fill="var(--color-muted-foreground)">
            {locale === 'zh' ? '② 纵向：state ↕ checkpoint' : '② Vertical: state ↕ checkpoint'}
          </text>

          {/* Horizontal run edges. */}
          <GraphEdge
            d={`M ${POS.model.x + 66} ${POS.model.y} L ${POS.tool.x - 66} ${POS.tool.y}`}
            active={s.track.kind === 'edge' && s.track.from === 'model'}
          />
          <GraphEdge
            d={`M ${POS.tool.x + 66} ${POS.tool.y} L ${POS.apply.x - 66} ${POS.apply.y}`}
            active={s.track.kind === 'edge' && s.track.from === 'tool'}
          />
          <GraphEdge
            d={`M ${POS.apply.x + 66} ${POS.apply.y} L ${POS.reply.x - 66} ${POS.reply.y}`}
            active={s.track.kind === 'edge' && s.track.from === 'apply'}
          />

          {/* Vertical checkpoint wire — the SAME node linked to the store. */}
          {cpExists && (
            <>
              <GraphEdge
                d={
                  s.track.kind === 'up'
                    ? `M ${vBot.x} ${vBot.y} L ${vTop.x} ${vTop.y}`
                    : `M ${vTop.x} ${vTop.y} L ${vBot.x} ${vBot.y}`
                }
                active={s.track.kind === 'down' || s.track.kind === 'up'}
                dashed
                label={
                  s.phase === 'persist'
                    ? locale === 'zh'
                      ? '序列化 ↓'
                      : 'serialize ↓'
                    : s.phase === 'resume'
                      ? locale === 'zh'
                        ? '反序列化 ↑'
                        : 'rehydrate ↑'
                      : undefined
                }
                labelX={vTop.x + 60}
                labelY={(vTop.y + vBot.y) / 2}
              />
            </>
          )}

          {/* Run-track nodes. */}
          {(Object.keys(POS) as NodeId[]).map((id) => (
            <GraphNode
              key={id}
              x={POS[id].x}
              y={POS[id].y}
              label={LABEL[id].label}
              sub={LABEL[id].sub[locale]}
              state={nodeState(id)}
            />
          ))}

          {/* Checkpoint store. */}
          <g opacity={cpExists ? 1 : 0.35} style={{ transition: 'opacity 0.35s' }}>
            <rect
              x={CP.x - CP.w / 2}
              y={CP.y - CP.h / 2}
              width={CP.w}
              height={CP.h}
              rx={10}
              fill={cpGlow ? 'var(--color-viz-node-active)' : 'var(--color-card)'}
              stroke={cpGlow ? 'var(--color-viz-node-active)' : 'var(--color-border)'}
              strokeWidth={cpGlow ? 2 : 1.25}
              strokeDasharray={cpExists ? undefined : '5 4'}
              style={{ transition: 'fill 0.35s, stroke 0.35s' }}
            />
            <text
              x={CP.x}
              y={CP.y - 8}
              textAnchor="middle"
              fontSize={12.5}
              fontWeight={600}
              fontFamily="var(--font-mono)"
              fill={cpGlow ? 'oklch(0.99 0.01 200)' : 'var(--color-foreground)'}
              style={{ transition: 'fill 0.35s' }}
            >
              CheckPoint · gob
            </text>
            <text
              x={CP.x}
              y={CP.y + 11}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill={cpGlow ? 'oklch(0.99 0.01 200 / 0.85)' : 'var(--color-muted-foreground)'}
              style={{ transition: 'fill 0.35s' }}
            >
              {cpExists ? 'Address:"ApprovalTool" · channels+state' : locale === 'zh' ? '（尚未生成）' : '(not yet written)'}
            </text>
          </g>

          {/* Waiting indicator: bytes resting in the checkpoint. */}
          {s.phase === 'wait' && (
            <FlowPacket from={{ x: CP.x, y: CP.y }} to={{ x: CP.x, y: CP.y }} progress={0} label="state" tone="done" />
          )}

          {/* The single traveling payload — on whichever wire is active. */}
          {packet && (
            <FlowPacket from={packet.from} to={packet.to} progress={packet.progress} label={s.wire} tone={packet.tone} />
          )}
        </VizCanvas>
      </div>
    </VizStage>
  )
}
