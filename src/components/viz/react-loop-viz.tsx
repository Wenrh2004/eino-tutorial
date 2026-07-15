import { useStepPlayer } from './use-step-player'
import { VizStage } from './viz-stage'
import { VizCanvas, ArrowDefs, GraphNode, GraphEdge, FlowPacket, type NodeState } from './graph-primitives'
import type { Locale } from '@/lib/i18n'

// The ReAct agent is a *compiled graph*, not a for-loop. This mirrors the
// topology built in adk/react.go: Init -> ChatModel -> (branch) -> either
// CancelCheck -> ToolNode -> AfterToolCalls -> back to ChatModel, or exit.
// Each step also carries the *concrete payload* traveling the active edge, so
// readers see what data moves, not just which edge lights up.

type NodeId = 'init' | 'model' | 'branch' | 'cancel' | 'tools' | 'after' | 'exit'

type Kind = 'value' | 'stream' | 'state' | 'control'

interface Step {
  active: NodeId | null
  edge: [NodeId, NodeId] | null
  states: Partial<Record<NodeId, NodeState>>
  caption: { zh: string; en: string }
  /** Short pill shown gliding along the active wire. */
  wire?: string
  /** Full payload + classification for the data-flow inspector. */
  payload?: string
  kind?: Kind
  iter?: number
}

const STEPS: Step[] = [
  {
    active: 'init',
    edge: null,
    states: { init: 'active' },
    caption: {
      zh: 'Init 节点：把用户输入与系统提示写入初始 state，作为图的入口。',
      en: 'Init: user input and system prompt are written into the initial state — the graph entry point.',
    },
    wire: 'user input',
    payload: 'state.Messages = [system, user("北京天气?")]',
    kind: 'state',
    iter: 1,
  },
  {
    active: 'model',
    edge: ['init', 'model'],
    states: { init: 'done', model: 'active' },
    caption: {
      zh: 'ChatModel 节点：调用大模型，产出一条 assistant 消息（可能带 tool_calls）。',
      en: 'ChatModel: the LLM is invoked, producing an assistant message (possibly with tool_calls).',
    },
    wire: '[]Message',
    payload: 'in: []Message{system, user}',
    kind: 'value',
    iter: 1,
  },
  {
    active: 'branch',
    edge: ['model', 'branch'],
    states: { init: 'done', model: 'done', branch: 'active' },
    caption: {
      zh: '分支判定：检查消息里有没有 tool_calls。有 → 继续工具路径；无 → 收敛到 Exit。',
      en: 'Branch: does the message contain tool_calls? Yes → tool path; No → converge to Exit.',
    },
    wire: 'AssistantMsg',
    payload: 'AssistantMessage{ tool_calls: [get_weather] }',
    kind: 'value',
    iter: 1,
  },
  {
    active: 'cancel',
    edge: ['branch', 'cancel'],
    states: { init: 'done', model: 'done', branch: 'done', cancel: 'active' },
    caption: {
      zh: 'CancelCheck 安全点：取消不是硬中断，而是建模为图中的一个节点，在此优雅停止。',
      en: 'CancelCheck safe-point: cancellation is a graph node, not a hard abort — the loop stops gracefully here.',
    },
    wire: 'has tools → tool path',
    payload: 'branch verdict: has tool_calls ⇒ route to tools',
    kind: 'control',
    iter: 1,
  },
  {
    active: 'tools',
    edge: ['cancel', 'tools'],
    states: { init: 'done', model: 'done', branch: 'done', cancel: 'done', tools: 'active' },
    caption: {
      zh: 'ToolNode：每个 tool_call 被映射成一个 AgentAction 并发执行，结果回收为 tool 消息。',
      en: 'ToolNode: each tool_call maps to an AgentAction, run and collected back as tool messages.',
    },
    wire: 'AgentAction[]',
    payload: 'AgentAction{ get_weather(city:"北京") }',
    kind: 'control',
    iter: 1,
  },
  {
    active: 'after',
    edge: ['tools', 'after'],
    states: { init: 'done', model: 'done', branch: 'done', cancel: 'done', tools: 'done', after: 'active' },
    caption: {
      zh: 'AfterToolCalls：把工具结果并回 state；若某工具声明 returnDirectly，则在此直接结束。',
      en: 'AfterToolCalls: tool results are merged into state; a returnDirectly tool can end the run right here.',
    },
    wire: 'ToolMessage',
    payload: 'ToolMessage{ "北京: 晴, 26°C" }',
    kind: 'value',
    iter: 1,
  },
  {
    active: 'model',
    edge: ['after', 'model'],
    states: { init: 'done', branch: 'done', cancel: 'done', tools: 'done', after: 'done', model: 'active' },
    caption: {
      zh: '回边：AfterToolCalls 连回 ChatModel，形成循环。这条环边正是 ReAct 的“Re”。（默认 MaxIterations=20 兜底）',
      en: 'Back-edge: AfterToolCalls loops to ChatModel — the cycle that makes it ReAct. (MaxIterations defaults to 20.)',
    },
    wire: 'state.Messages += toolMsg',
    payload: 'state.Messages = [..., assistant, tool] (grew by 1 turn)',
    kind: 'state',
    iter: 2,
  },
  {
    active: 'branch',
    edge: ['model', 'branch'],
    states: { model: 'done', branch: 'active', after: 'done', tools: 'done', cancel: 'done', init: 'done' },
    caption: {
      zh: '第二轮：模型这次不再要求工具，分支转向 Exit 路径。',
      en: 'Second turn: the model no longer requests tools, so the branch routes toward Exit.',
    },
    wire: 'AssistantMsg (no tools)',
    payload: 'AssistantMessage{ content: "北京今天晴，26°C", tool_calls: ∅ }',
    kind: 'value',
    iter: 2,
  },
  {
    active: 'exit',
    edge: ['branch', 'exit'],
    states: { branch: 'done', exit: 'done', model: 'done', after: 'done', tools: 'done', cancel: 'done', init: 'done' },
    caption: {
      zh: 'Exit：最终 assistant 消息作为图输出返回。整个 ReAct 循环，就是这张编译好的图被执行一遍。',
      en: 'Exit: the final assistant message is returned as graph output. The whole ReAct loop is just this compiled graph, run once.',
    },
    wire: 'final output',
    payload: 'return AssistantMessage{ content: "北京今天晴，26°C" }',
    kind: 'value',
    iter: 2,
  },
]

const POS: Record<NodeId, { x: number; y: number }> = {
  init: { x: 90, y: 70 },
  model: { x: 300, y: 70 },
  branch: { x: 510, y: 70 },
  exit: { x: 700, y: 70 },
  cancel: { x: 510, y: 190 },
  tools: { x: 300, y: 190 },
  after: { x: 90, y: 190 },
}

const LABEL: Record<NodeId, { label: string; sub?: string }> = {
  init: { label: 'Init', sub: 'entry' },
  model: { label: 'ChatModel', sub: 'LLM call' },
  branch: { label: 'Branch', sub: 'tool_calls?' },
  exit: { label: 'Exit', sub: 'output' },
  cancel: { label: 'CancelCheck', sub: 'safe-point' },
  tools: { label: 'ToolNode', sub: 'AgentAction[]' },
  after: { label: 'AfterToolCalls', sub: 'merge state' },
}

function edgePath(from: NodeId, to: NodeId): string {
  const a = POS[from]
  const b = POS[to]
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

export function ReactLoopViz({ locale }: { locale: Locale }) {
  const player = useStepPlayer({ count: STEPS.length, intervalMs: 1600 })
  const s = STEPS[player.step]!

  const nodeState = (id: NodeId): NodeState => s.states[id] ?? 'idle'
  const isEdge = (from: NodeId, to: NodeId) =>
    s.edge != null && s.edge[0] === from && s.edge[1] === to

  const nameOf = (id: NodeId) => LABEL[id].label

  return (
    <VizStage
      locale={locale}
      title={locale === 'zh' ? 'ReAct = 编译好的图' : 'ReAct = a compiled graph'}
      player={player}
      total={STEPS.length}
      caption={s.caption[locale]}
      dataFlow={
        s.edge && s.payload
          ? {
              from: nameOf(s.edge[0]),
              to: nameOf(s.edge[1]),
              payload: s.payload,
              kind: s.kind ?? 'value',
            }
          : s.payload
            ? { from: 'user', to: nameOf(s.active ?? 'init'), payload: s.payload, kind: s.kind ?? 'state' }
            : null
      }
    >
      <VizCanvas viewBox="0 0 790 260">
        <ArrowDefs />

        {/* Static structural edges (dim), then the active one on top. */}
        <GraphEdge d={edgePath('init', 'model')} active={isEdge('init', 'model')} />
        <GraphEdge d={edgePath('model', 'branch')} active={isEdge('model', 'branch')} />
        <GraphEdge
          d={edgePath('branch', 'exit')}
          active={isEdge('branch', 'exit')}
          label={locale === 'zh' ? '无工具' : 'no tools'}
          labelX={605}
          labelY={60}
        />
        <GraphEdge
          d={edgePath('branch', 'cancel')}
          active={isEdge('branch', 'cancel')}
          label={locale === 'zh' ? '有工具' : 'has tools'}
          labelX={548}
          labelY={130}
        />
        <GraphEdge d={edgePath('cancel', 'tools')} active={isEdge('cancel', 'tools')} />
        <GraphEdge d={edgePath('tools', 'after')} active={isEdge('tools', 'after')} />
        {/* Back-edge: after -> model (the loop). */}
        <GraphEdge
          d={`M ${POS.after.x} ${POS.after.y - 23} C ${POS.after.x} 20, ${POS.model.x} 20, ${POS.model.x} ${POS.model.y - 23}`}
          active={isEdge('after', 'model')}
          dashed
          label={locale === 'zh' ? '循环回边' : 'loop'}
          labelX={195}
          labelY={14}
        />

        {(Object.keys(POS) as NodeId[]).map((id) => (
          <GraphNode
            key={id}
            x={POS[id].x}
            y={POS[id].y}
            label={LABEL[id].label}
            sub={LABEL[id].sub}
            state={nodeState(id)}
          />
        ))}

        {/* Concrete payload gliding along the active edge. */}
        {s.edge && s.wire && (
          <FlowPacket
            from={POS[s.edge[0]]}
            to={POS[s.edge[1]]}
            progress={0.5}
            label={s.wire}
            tone={s.kind === 'control' ? 'danger' : s.kind === 'state' ? 'done' : 'active'}
          />
        )}

        {/* Iteration badge. */}
        {s.iter && (
          <text x={760} y={248} textAnchor="end" fontSize={11} fill="var(--color-muted-foreground)">
            {locale === 'zh' ? `第 ${s.iter} 轮` : `iteration ${s.iter}`}
          </text>
        )}
      </VizCanvas>
    </VizStage>
  )
}
