import { useStepPlayer } from './use-step-player'
import { VizStage } from './viz-stage'
import { VizCanvas, ArrowDefs, GraphNode, GraphEdge, FlowPacket, type NodeState } from './graph-primitives'
import type { Locale } from '@/lib/i18n'

// The composition debate, side by side.
// LEFT  = transfer route: control *jumps* to sub-agent over a SHARED session.
//         Exit/Transfer/Interrupt all act on the one shared control flow.
// RIGHT = agent-as-tool route (agent_tool.go): the sub-agent runs INSIDE a tool
//         call with an ISOLATED session. Exit/Transfer/BreakLoop are absorbed at
//         the tool boundary; only Interrupted propagates upward.
// Each step also names the concrete payload crossing the active boundary so the
// difference in *what data flows across it* is explicit.

interface Step {
  side: 'left' | 'right' | 'both'
  leftActive: string[]
  rightActive: string[]
  leftEdge: [string, string] | null
  rightEdge: [string, string] | null
  danger?: 'left' | 'right'
  /** Short pill gliding on the active wire. */
  wire?: string
  /** Full payload for the data-flow inspector. */
  from?: string
  to?: string
  payload?: string
  kind?: 'value' | 'stream' | 'state' | 'control'
  caption: { zh: string; en: string }
}

const STEPS: Step[] = [
  {
    side: 'both',
    leftActive: ['sup'],
    rightActive: ['sup'],
    leftEdge: null,
    rightEdge: null,
    from: 'user',
    to: 'Supervisor',
    payload: 'task: "调研 X 并总结"',
    kind: 'state',
    caption: {
      zh: '两条路线的起点相同：一个主 Agent（Supervisor）需要把子任务交给子 Agent。差别在“怎么交”。',
      en: 'Both routes start the same: a supervisor agent must hand a subtask to a sub-agent. The difference is *how*.',
    },
  },
  {
    side: 'left',
    leftActive: ['sup', 'sub'],
    rightActive: [],
    leftEdge: ['sup', 'sub'],
    rightEdge: null,
    wire: 'session (shared)',
    from: 'Supervisor',
    to: 'Sub-Agent',
    payload: 'transfer: 整个 session（历史 + 状态）指针直接移交',
    kind: 'control',
    caption: {
      zh: 'Transfer 路线：控制权直接“跳转”到子 Agent，两者共享同一个 session（历史、状态全暴露）。',
      en: 'Transfer: control *jumps* to the sub-agent; both share one session (history and state fully exposed).',
    },
  },
  {
    side: 'left',
    leftActive: ['sub'],
    rightActive: [],
    leftEdge: null,
    rightEdge: null,
    danger: 'left',
    wire: 'Exit / Transfer ↯',
    from: 'Sub-Agent',
    to: '共享控制流',
    payload: 'sub emits Exit ⇒ 整条共享控制流终止，父级无法隔离',
    kind: 'control',
    caption: {
      zh: '问题：子 Agent 里的 Exit / Transfer / 中断都作用在这条共享控制流上，父级难以隔离与恢复——这正是官方标注 NOT RECOMMENDED 的原因。',
      en: 'Problem: the sub-agent’s Exit / Transfer / interrupts all act on the shared control flow, so the parent can’t isolate or recover them — hence the NOT RECOMMENDED note.',
    },
  },
  {
    side: 'right',
    leftActive: [],
    rightActive: ['sup', 'tool'],
    leftEdge: null,
    rightEdge: ['sup', 'tool'],
    wire: 'tool_call(args)',
    from: 'Supervisor',
    to: 'typedAgentTool',
    payload: 'tool_call{ name:"research_agent", args:{query:"X"} }',
    kind: 'value',
    caption: {
      zh: 'Agent-as-Tool 路线：子 Agent 被 typedAgentTool 包装成一个普通工具，父级只是“调用一个工具”。',
      en: 'Agent-as-Tool: the sub-agent is wrapped by typedAgentTool into an ordinary tool; the parent merely “calls a tool”.',
    },
  },
  {
    side: 'right',
    leftActive: [],
    rightActive: ['tool', 'sub'],
    leftEdge: null,
    rightEdge: ['tool', 'sub'],
    wire: 'fresh session',
    from: 'typedAgentTool',
    to: 'Sub-Agent',
    payload: 'run sub-agent in NEW isolated session (只喂 args，不共享父历史)',
    kind: 'state',
    caption: {
      zh: '工具内部：子 Agent 在一个隔离的 session 中独立运行，父子历史互不污染。',
      en: 'Inside the tool: the sub-agent runs in an isolated session; parent and child histories never contaminate each other.',
    },
  },
  {
    side: 'right',
    leftActive: [],
    rightActive: ['tool', 'sub'],
    leftEdge: ['sub', 'tool'],
    rightEdge: ['sub', 'tool'],
    danger: 'right',
    wire: 'Exit → swallowed',
    from: 'Sub-Agent',
    to: 'typedAgentTool',
    payload: 'sub emits Exit/Transfer/BreakLoop ⇒ 在边界被吞，仅表示“本次工具调用结束”',
    kind: 'control',
    caption: {
      zh: '边界吸收：子 Agent 的 Exit / Transfer / BreakLoop 在工具边界被“吞掉”，只当作这次工具调用的结束。',
      en: 'Boundary absorption: the sub-agent’s Exit / Transfer / BreakLoop are “swallowed” at the tool boundary — treated only as this tool call ending.',
    },
  },
  {
    side: 'right',
    leftActive: [],
    rightActive: ['tool', 'sup'],
    leftEdge: null,
    rightEdge: ['tool', 'sup'],
    wire: 'ToolMessage | Interrupted↑',
    from: 'typedAgentTool',
    to: 'Supervisor',
    payload: 'ToolMessage{result} —— 唯 Interrupted 经 CompositeInterrupt 向上冒泡',
    kind: 'value',
    caption: {
      zh: '唯一穿透的是 Interrupted：它经 CompositeInterrupt 向上冒泡，让父级 checkpoint 得以覆盖整棵调用树——可组合、可中断、可续跑。',
      en: 'Only Interrupted passes through: it bubbles up via CompositeInterrupt so the parent’s checkpoint covers the whole call tree — composable, interruptible, resumable.',
    },
  },
]

// Left column layout.
const L = {
  sup: { x: 130, y: 70 },
  sub: { x: 130, y: 190 },
}
// Right column layout.
const R = {
  sup: { x: 530, y: 60 },
  tool: { x: 530, y: 140 },
  sub: { x: 530, y: 220 },
}

export function AgentToolVsTransferViz({ locale }: { locale: Locale }) {
  const player = useStepPlayer({ count: STEPS.length, intervalMs: 1800 })
  const s = STEPS[player.step]!

  const st = (id: string, active: string[], danger?: boolean): NodeState =>
    active.includes(id) ? (danger ? 'danger' : 'active') : 'idle'

  const leftDim = s.side === 'right'
  const rightDim = s.side === 'left'

  const packTone = s.kind === 'control' ? 'danger' : s.kind === 'state' ? 'done' : 'active'

  return (
    <VizStage
      locale={locale}
      title={locale === 'zh' ? 'Transfer vs Agent-as-Tool' : 'Transfer vs Agent-as-Tool'}
      player={player}
      total={STEPS.length}
      caption={s.caption[locale]}
      dataFlow={
        s.payload && s.from && s.to
          ? { from: s.from, to: s.to, payload: s.payload, kind: s.kind ?? 'value' }
          : null
      }
    >
      <VizCanvas viewBox="0 0 720 280">
        <ArrowDefs />

        {/* Divider. */}
        <line x1={330} y1={20} x2={330} y2={260} stroke="var(--color-border)" strokeDasharray="4 4" />
        <text x={130} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-muted-foreground)">
          {locale === 'zh' ? 'Transfer（共享 session）' : 'Transfer (shared session)'}
        </text>
        <text x={530} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-muted-foreground)">
          {locale === 'zh' ? 'Agent-as-Tool（隔离）' : 'Agent-as-Tool (isolated)'}
        </text>

        {/* LEFT column. */}
        <g opacity={leftDim ? 0.28 : 1} style={{ transition: 'opacity 0.35s' }}>
          <GraphEdge
            d={`M ${L.sup.x} ${L.sup.y + 23} L ${L.sub.x} ${L.sub.y - 23}`}
            active={!!s.leftEdge}
            dashed
            label={locale === 'zh' ? '控制权跳转' : 'control jumps'}
            labelX={215}
            labelY={130}
          />
          <GraphNode x={L.sup.x} y={L.sup.y} label="Supervisor" sub="parent" state={st('sup', s.leftActive, s.danger === 'left')} />
          <GraphNode x={L.sub.x} y={L.sub.y} label="Sub-Agent" sub={locale === 'zh' ? '共享历史' : 'shared history'} state={st('sub', s.leftActive, s.danger === 'left')} />
          {(s.side === 'left' || s.side === 'both') && s.wire && (
            <FlowPacket
              from={s.leftEdge ? L[s.leftEdge[0] as keyof typeof L] : L.sub}
              to={s.leftEdge ? L[s.leftEdge[1] as keyof typeof L] : { x: L.sub.x + 150, y: L.sub.y }}
              progress={0.5}
              label={s.wire}
              tone={packTone}
            />
          )}
        </g>

        {/* RIGHT column. */}
        <g opacity={rightDim ? 0.28 : 1} style={{ transition: 'opacity 0.35s' }}>
          <GraphEdge d={`M ${R.sup.x} ${R.sup.y + 23} L ${R.tool.x} ${R.tool.y - 23}`} active={s.rightEdge?.[0] === 'sup' || s.rightEdge?.[1] === 'sup'} />
          <GraphEdge d={`M ${R.tool.x - 22} ${R.tool.y + 20} L ${R.sub.x - 22} ${R.sub.y - 20}`} active={s.rightEdge?.[1] === 'sub'} />
          <GraphEdge d={`M ${R.sub.x + 22} ${R.sub.y - 20} L ${R.tool.x + 22} ${R.tool.y + 20}`} active={s.rightEdge?.[0] === 'sub'} dashed />
          <GraphNode x={R.sup.x} y={R.sup.y} label="Supervisor" sub="parent" state={st('sup', s.rightActive)} />
          <GraphNode x={R.tool.x} y={R.tool.y} label="typedAgentTool" sub={locale === 'zh' ? '边界' : 'boundary'} state={st('tool', s.rightActive, s.danger === 'right')} />
          <GraphNode x={R.sub.x} y={R.sub.y} label="Sub-Agent" sub={locale === 'zh' ? '隔离 session' : 'isolated session'} state={st('sub', s.rightActive)} />
          {s.side === 'right' && s.wire && s.rightEdge && (
            <FlowPacket
              from={R[s.rightEdge[0] as keyof typeof R]}
              to={R[s.rightEdge[1] as keyof typeof R]}
              progress={0.5}
              label={s.wire}
              tone={packTone}
            />
          )}
        </g>
      </VizCanvas>
    </VizStage>
  )
}
