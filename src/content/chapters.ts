// Single source of truth for the tutorial's structure.
// Drives the sidebar, the dynamic routes, the prerender page list, and the
// prev/next pager. The ADK-centric ordering mirrors the approved outline.

export type Locale = 'zh' | 'en'

export const LOCALES: Locale[] = ['zh', 'en']
export const DEFAULT_LOCALE: Locale = 'zh'

export interface LocalizedText {
  zh: string
  en: string
}

export interface Chapter {
  /** URL slug, unique across the whole book. */
  slug: string
  /** 1-based global chapter number. */
  number: number
  title: LocalizedText
  summary: LocalizedText
  /** Which flagship visualization this chapter embeds, if any. */
  viz?:
    | 'react-loop'
    | 'agent-tool-vs-transfer'
    | 'runnable-paradigm'
    | 'checkpoint-resume'
    | 'fan-in-fan-out'
  /** Whether authored content exists (vs. a generated placeholder). */
  status: 'written' | 'placeholder'
  /** Key source-code anchors, shown in every chapter. */
  sources?: string[]
}

export interface Part {
  id: string
  title: LocalizedText
  intro: LocalizedText
  chapters: Chapter[]
}

export const PARTS: Part[] = [
  {
    id: 'part-1',
    title: { zh: 'Part I · ADK 的使用', en: 'Part I · Using the ADK' },
    intro: {
      zh: '半天内用 ADK 跑通「单 Agent → 工具 → 记忆 → 中断续跑 → 多智能体」，建立全景直觉。',
      en: 'Get productive with the ADK fast: single agent, tools, memory, interrupt/resume, multi-agent.',
    },
    chapters: [
      {
        slug: 'why-adk-first',
        number: 1,
        title: { zh: '为什么先学 ADK', en: 'Why Learn the ADK First' },
        summary: {
          zh: '三仓库关系、ADK 在框架中的位置，以及它把「模型+工具+记忆+中断+多智能体」收敛成统一运行时。',
          en: 'The three repos, where the ADK sits, and how it unifies models, tools, memory, interrupts and multi-agent.',
        },
        status: 'written',
        sources: ['adk/interface.go', 'adk/runner.go'],
      },
      {
        slug: 'chatmodelagent-and-runner',
        number: 2,
        title: { zh: 'ChatModelAgent 与 Runner', en: 'ChatModelAgent and Runner' },
        summary: {
          zh: 'Agent 配置项、Runner.Run vs Query、EnableStreaming 与事件流消费。',
          en: 'Agent config, Runner.Run vs Query, EnableStreaming and consuming the event stream.',
        },
        status: 'written',
        sources: ['adk/chatmodel.go', 'adk/runner.go', 'adk/utils.go'],
      },
      {
        slug: 'giving-agents-tools',
        number: 3,
        title: { zh: '给 Agent 装上工具', en: 'Giving Agents Tools' },
        summary: {
          zh: 'ToolInfo / InvokableTool、WithTools 不可变绑定、自动注入的 exit 工具与 returnDirectly。',
          en: 'ToolInfo / InvokableTool, immutable WithTools, the injected exit tool, and returnDirectly.',
        },
        status: 'written',
        sources: ['components/tool/interface.go', 'components/model/interface.go:95', 'adk/chatmodel.go'],
      },
      {
        slug: 'memory-session-streaming',
        number: 4,
        title: { zh: '记忆、Session 与流式输出', en: 'Memory, Session and Streaming' },
        summary: {
          zh: '会话记忆、Session 跨步骤传值、把 Agent 事件流转成 SSE。',
          en: 'Conversation memory, passing values through the session, turning events into SSE.',
        },
        status: 'written',
        sources: ['adk/runctx.go'],
      },
      {
        slug: 'hitl-first-look',
        number: 5,
        title: { zh: '中断与人在回路（先会用）', en: 'Interrupt and HITL (First Look)' },
        summary: {
          zh: '工具触发中断 → 存 checkpoint → Resume 续跑；审批、改参、追问三类场景。',
          en: 'Tool-triggered interrupt to checkpoint to resume: approval, edit-args, follow-up.',
        },
        viz: 'checkpoint-resume',
        status: 'written',
        sources: ['adk/runner.go', 'adk/interrupt.go'],
      },
      {
        slug: 'middleware-add-capabilities',
        number: 6,
        title: { zh: '中间件：给 Agent 叠能力', en: 'Middleware: Stacking Capabilities' },
        summary: {
          zh: '中间件「叠加」心智；filesystem / plantask / summarization / skill / toolsearch 速览。',
          en: 'The stacking mindset; a tour of filesystem, plantask, summarization, skill, toolsearch.',
        },
        status: 'written',
        sources: ['adk/handler.go', 'adk/middlewares/filesystem/filesystem.go:173'],
      },
      {
        slug: 'multiagent-two-routes',
        number: 7,
        title: { zh: '多智能体：先跑通两条路线', en: 'Multi-Agent: Two Routes' },
        summary: {
          zh: '对照体验 supervisor（集中协调）vs DeepAgent（agent-as-tool）与 plan-execute。',
          en: 'Feel the contrast: supervisor vs DeepAgent (agent-as-tool) and plan-execute.',
        },
        status: 'written',
        sources: ['adk/prebuilt/supervisor/supervisor.go:101', 'adk/prebuilt/deep/deep.go:171', 'adk/prebuilt/planexecute/plan_execute.go:862'],
      },
    ],
  },
  {
    id: 'part-2',
    title: { zh: 'Part II · ADK 的设计', en: 'Part II · Designing with the ADK' },
    intro: {
      zh: '从「会用」升到「理解设计意图」：ADK 的世界观、组合哲学、扩展模型。这是 Agent 设计哲学的正文。',
      en: 'From usage to intent: the ADK worldview, its composition philosophy, and its extension model.',
    },
    chapters: [
      {
        slug: 'adk-worldview',
        number: 8,
        title: { zh: 'ADK 世界观：Agent = 事件流生成器', en: 'Worldview: Agent = Event-Stream Generator' },
        summary: {
          zh: 'TypedAgent[M] 三方法、事件判别联合、MessageVariant 承载物化消息或活流。',
          en: 'The 3-method TypedAgent[M], the event union, and MessageVariant carrying a message or a live stream.',
        },
        status: 'written',
        sources: ['adk/interface.go:453', 'adk/interface.go:419', 'adk/interface.go:73'],
      },
      {
        slug: 'composition-philosophy',
        number: 9,
        title: { zh: '组合哲学之争', en: 'The Composition Debate' },
        summary: {
          zh: 'transfer 路线（共享 session，NOT RECOMMENDED）vs agent-as-tool / DeepAgent（隔离、可组合、中断可传播）。',
          en: 'Transfer (shared session, NOT RECOMMENDED) vs agent-as-tool / DeepAgent (isolated, composable, interrupt-safe).',
        },
        viz: 'agent-tool-vs-transfer',
        status: 'written',
        sources: ['adk/interface.go:330', 'adk/flow.go', 'adk/agent_tool.go', 'adk/prebuilt/deep/deep.go:171'],
      },
      {
        slug: 'middleware-design',
        number: 10,
        title: { zh: '中间件与 Handler 的设计', en: 'Designing Middleware and Handlers' },
        summary: {
          zh: '六个钩子、Middlewares 先于 Handlers 的执行序、两类职责与内置件分类学。',
          en: 'The six hooks, the Middlewares-before-Handlers order, and a taxonomy of the built-ins.',
        },
        status: 'written',
        sources: ['adk/handler.go'],
      },
      {
        slug: 'prebuilt-agent-patterns',
        number: 11,
        title: { zh: '预置 Agent 的设计范式', en: 'Prebuilt Agent Patterns' },
        summary: {
          zh: 'supervisor、plan-execute、DeepAgent 各代表一种组合范式。',
          en: 'supervisor, plan-execute and DeepAgent each embody a composition pattern.',
        },
        status: 'written',
        sources: ['adk/prebuilt/supervisor/supervisor.go:101', 'adk/prebuilt/planexecute/plan_execute.go:862', 'adk/prebuilt/deep/deep.go:171'],
      },
      {
        slug: 'agentic-message-and-generics',
        number: 12,
        title: { zh: 'v0.9 的 AgenticMessage 与泛型化', en: 'v0.9 AgenticMessage and Generics' },
        summary: {
          zh: 'AgenticMessage/ContentBlock、AgenticModel、ADK 全面泛型化让 chat 与 agentic 复用同一体系。',
          en: 'AgenticMessage/ContentBlock, AgenticModel, and generifying the ADK so chat and agentic share one system.',
        },
        status: 'written',
        sources: ['schema/agentic_message.go:71', 'schema/agentic_message.go:102', 'components/model/interface.go:36', 'adk/interface.go:43'],
      },
    ],
  },
  {
    id: 'part-3',
    title: { zh: 'Part III · ADK 的实现', en: 'Part III · How the ADK Works' },
    intro: {
      zh: '打开 ADK 的引擎盖，看清它如何架在 compose 图之上，以及中断/取消/续跑为何是一等公民。',
      en: 'Open the hood: how the ADK sits on the compose graph, and why interrupt/cancel/resume are first-class.',
    },
    chapters: [
      {
        slug: 'runner-and-flowagent',
        number: 13,
        title: { zh: 'Runner 与 flowAgent：运行骨架', en: 'Runner and flowAgent: The Skeleton' },
        summary: {
          zh: 'toFlowAgent 统一包裹、flowAgent.run() 负责回调/RunPath/transfer、中断时的 checkpoint 持久化。',
          en: 'The toFlowAgent wrapper, flowAgent.run() for callbacks/RunPath/transfer, and checkpointing on interrupt.',
        },
        status: 'written',
        sources: ['adk/runner.go:55', 'adk/flow.go:104', 'adk/runctx.go:346'],
      },
      {
        slug: 'react-is-a-graph',
        number: 14,
        title: { zh: 'ReAct 不是 for 循环，而是编译好的图', en: 'ReAct Is a Compiled Graph, Not a Loop' },
        summary: {
          zh: 'ReAct 图拓扑（默认 MaxIter=20）、cancel 建模为图节点安全点、工具映射成 AgentAction。',
          en: 'The ReAct graph topology (MaxIter=20), cancel as graph safe-points, tools mapped to AgentAction.',
        },
        viz: 'react-loop',
        status: 'written',
        sources: ['adk/react.go', 'adk/chatmodel.go'],
      },
      {
        slug: 'turnloop-cancel-interrupt',
        number: 15,
        title: { zh: 'TurnLoop、取消与中断的实现', en: 'TurnLoop, Cancel and Interrupt' },
        summary: {
          zh: '推送式事件循环、CancelMode 安全点状态机、bridgeStore 桥接 ADK↔compose 两层 checkpoint。',
          en: 'The push loop, the CancelMode safe-point state machine, and bridgeStore across ADK/compose.',
        },
        viz: 'checkpoint-resume',
        status: 'written',
        sources: ['adk/turn_loop.go:896', 'adk/cancel.go:43', 'adk/interrupt.go:325'],
      },
      {
        slug: 'agenttool-implementation',
        number: 16,
        title: { zh: 'AgentTool 的实现：控制流隔离的秘密', en: 'AgentTool: The Secret of Isolation' },
        summary: {
          zh: 'typedAgentTool[M] 如何适配 tool.BaseTool，为何 Exit/Transfer 被吞而 Interrupted 穿透。',
          en: 'How typedAgentTool[M] adapts to tool.BaseTool; why Exit/Transfer are absorbed but Interrupted propagates.',
        },
        viz: 'agent-tool-vs-transfer',
        status: 'written',
        sources: ['adk/agent_tool.go:120', 'adk/interface.go:346'],
      },
      {
        slug: 'context-harness-loop',
        number: 17,
        title: { zh: 'Context / Harness / Loop：三引擎映射', en: 'Context / Harness / Loop: The Three Engines' },
        summary: {
          zh: 'Agent 运行时的三大引擎——上下文引擎、执行骨架、循环引擎——如何逐一落在 ADK 的 runContext、prepareExecContext 与 TurnLoop 上。',
          en: 'The three engines of an agent runtime — Context, Harness, Loop — mapped onto the ADK’s runContext, prepareExecContext and TurnLoop.',
        },
        status: 'written',
        sources: [
          'adk/runctx.go:346',
          'adk/instruction.go:48',
          'adk/chatmodel.go:855',
          'adk/handler.go:139',
          'adk/react.go:366',
          'adk/turn_loop.go:1570',
          'adk/cancel.go:43',
        ],
      },
    ],
  },
  {
    id: 'part-4',
    title: { zh: 'Part IV · 支撑 ADK 的编排引擎', en: 'Part IV · The Engine Beneath' },
    intro: {
      zh: 'ADK 的中断/流式/类型安全，全都来自底层 compose 引擎。本部分下沉讲清实现基座。',
      en: 'The ADK inherits interrupts, streaming and type-safety from the compose engine underneath.',
    },
    chapters: [
      {
        slug: 'runnable-four-paradigms',
        number: 18,
        title: { zh: 'Runnable 与四范式自动适配', en: 'Runnable and the Four Paradigms' },
        summary: {
          zh: 'Invoke/Stream/Collect/Transform、缺失方法自动降级链、单值↔流的装箱与拼接原语。',
          en: 'Invoke/Stream/Collect/Transform, the auto-downgrade chains, and the box/concat primitives.',
        },
        viz: 'runnable-paradigm',
        status: 'written',
        sources: ['compose/runnable.go:32', 'compose/runnable.go:345', 'compose/types_lambda.go'],
      },
      {
        slug: 'pregel-vs-dag',
        number: 19,
        title: { zh: '两套执行引擎：Pregel vs DAG', en: 'Two Engines: Pregel vs DAG' },
        summary: {
          zh: '同一 run 循环靠替换 channel 切换语义；AnyPredecessor（支持环）vs AllPredecessor（skip 传播）。',
          en: 'One run loop, two channel strategies: AnyPredecessor (cyclic) vs AllPredecessor (skip-propagating).',
        },
        status: 'written',
        sources: ['compose/graph_run.go:241', 'compose/graph_manager.go:29', 'compose/pregel.go:25', 'compose/dag.go:50', 'compose/graph.go:679'],
      },
      {
        slug: 'graph-chain-workflow',
        number: 20,
        title: { zh: 'Graph / Chain / Workflow 与类型检查', en: 'Graph / Chain / Workflow and Type Checks' },
        summary: {
          zh: 'reflect.Type 传播 + toValidateMap 硬校验；Chain 是线性糖；Workflow 用字段映射并强制 DAG。',
          en: 'reflect.Type propagation + the toValidateMap gate; Chain is sugar; Workflow forces DAG via field mapping.',
        },
        status: 'written',
        sources: ['compose/generic_graph.go:93', 'compose/graph.go:561', 'compose/chain.go:560', 'compose/workflow.go:43'],
      },
      {
        slug: 'streams-and-state',
        number: 21,
        title: { zh: '流机制与状态管理', en: 'Streams and State' },
        summary: {
          zh: 'Copy 的 copy-on-read 链表、MergeNamedStreamReaders、装箱、ProcessState 按类型逐级查找。',
          en: 'Copy-on-read for Copy, MergeNamedStreamReaders, boxing, and type-directed ProcessState.',
        },
        status: 'written',
        sources: ['schema/stream.go:261', 'schema/stream.go:837', 'schema/stream.go:912', 'compose/state.go:165'],
      },
      {
        slug: 'fan-in-fan-out',
        number: 22,
        title: { zh: '扇出与扇入：并行的两端', en: 'Fan-Out and Fan-In: Both Ends of Parallelism' },
        summary: {
          zh: '扇出靠 copyItem（值共享引用、流走 copy-on-read）；扇入靠 mergeValues（map 键并集、流按到达序）；Pregel「任一」vs DAG「齐活 + skip」。',
          en: 'Fan-out via copyItem (values share a ref, streams copy-on-read); fan-in via mergeValues (map key-union, streams by arrival); Pregel “any” vs DAG “all + skip”.',
        },
        viz: 'fan-in-fan-out',
        status: 'written',
        sources: [
          'compose/graph_run.go:1020',
          'schema/stream.go:837',
          'compose/values_merge.go:39',
          'internal/merge.go:62',
          'schema/stream.go:538',
          'compose/pregel.go:55',
          'compose/dag.go:128',
          'compose/field_mapping.go:31',
        ],
      },
      {
        slug: 'graph-checkpoint-resume',
        number: 23,
        title: { zh: '图引擎的中断 / Checkpoint / 续跑', en: 'Graph Interrupt / Checkpoint / Resume' },
        summary: {
          zh: 'Interrupt 家族、Address 定位、gob 序列化、Resume/ResumeWithData/BatchResumeWithData。',
          en: 'The Interrupt family, Address targeting, gob serialization, and the Resume APIs.',
        },
        viz: 'checkpoint-resume',
        status: 'written',
        sources: ['compose/interrupt.go', 'compose/checkpoint.go', 'compose/resume.go'],
      },
    ],
  },
  {
    id: 'part-5',
    title: { zh: 'Part V · 综合实战与工程化', en: 'Part V · Capstone and Productionization' },
    intro: {
      zh: '把 ADK 主线拼成生产级应用，并接入可观测/调试/部署。',
      en: 'Assemble the ADK into production apps with observability, debugging and deployment.',
    },
    chapters: [
      {
        slug: 'graphtool-capstone',
        number: 24,
        title: { zh: '把编排包装成 Agent 工具（GraphTool）', en: 'Wrapping Orchestration as Tools (GraphTool)' },
        summary: {
          zh: 'Chain 做摘要工具 / Graph 并行研究 / Workflow 订单审批 / 两层嵌套中断。',
          en: 'Chain as a summarizer tool, parallel research graph, workflow approval, nested interrupts.',
        },
        status: 'written',
        sources: [
          'eino-examples/adk/common/tool/graphtool/graph_tool.go:32',
          'eino-examples/adk/common/tool/graphtool/graph_tool.go:77',
          'eino-examples/adk/common/tool/graphtool/graph_tool.go:134',
          'eino-examples/adk/common/tool/graphtool/graph_tool.go:303',
        ],
      },
      {
        slug: 'rag-capstone',
        number: 25,
        title: { zh: 'RAG 全流程 Capstone', en: 'End-to-End RAG Capstone' },
        summary: {
          zh: 'answer_from_document 工具:一张 load→chunk→score→filter→answer 的 Workflow，字段级扇入 + BatchNode 并发打分。',
          en: 'The answer_from_document tool: a load→chunk→score→filter→answer Workflow with field-level fan-in and BatchNode parallel scoring.',
        },
        status: 'written',
        sources: [
          'quickstart/chatwitheino/rag/rag.go:122',
          'quickstart/chatwitheino/rag/rag.go:158',
          'quickstart/chatwitheino/rag/rag.go:124',
          'eino-examples/adk/common/tool/graphtool/graph_tool.go:42',
        ],
      },
      {
        slug: 'observability-devops',
        number: 26,
        title: { zh: '可观测性、调试与部署', en: 'Observability, Debugging and Deployment' },
        summary: {
          zh: 'callback → Langfuse/APMPlus/CozeLoop、Eino Dev 可视化、A2UI 全栈。',
          en: 'Callbacks to Langfuse/APMPlus/CozeLoop, the Eino Dev visualizer, and a full-stack A2UI app.',
        },
        status: 'written',
        sources: [
          'callbacks/interface.go:85',
          'callbacks/aspect_inject.go:74',
          'eino-ext/callbacks/langfuse/langfuse.go:128',
          'eino-examples/devops/visualize/mermaid.go:74',
        ],
      },
      {
        slug: 'capstone-project',
        number: 27,
        title: { zh: '综合大项目（生产级 Agent 应用）', en: 'Capstone Project (A Production Agent App)' },
        summary: {
          zh: 'chatwitheino:deep.NewTyped 叠中间件 + 审批中断 + TurnLoop 服务化，并做一次全书复盘。',
          en: 'chatwitheino: deep.NewTyped with middleware, an approval interrupt, TurnLoop as a service, plus a whole-book retrospective.',
        },
        status: 'written',
        sources: [
          'quickstart/chatwitheino/agent.go:39',
          'quickstart/chatwitheino/agent.go:122',
          'quickstart/chatwitheino/server/server.go:570',
          'quickstart/chatwitheino/main.go:69',
        ],
      },
      {
        slug: 'agent-runtime-in-go',
        number: 28,
        title: { zh: 'Agent Runtime 长在 Go 原生机制上', en: 'An Agent Runtime Built on Native Go' },
        summary: {
          zh: '收束全书：每并行节点一 goroutine + unbounded channel 调度、context 贯穿取消、泛型承载类型安全、接口作组合接缝、gob 做原生持久化。',
          en: 'The finale: one goroutine per parallel node over an unbounded channel, context-threaded cancel, generics for type-safety, interfaces as seams, gob for native persistence.',
        },
        status: 'written',
        sources: [
          'compose/graph_manager.go:300',
          'internal/channel.go:22',
          'adk/interface.go:453',
          'components/model/interface.go:36',
          'compose/runnable.go:32',
          'schema/serialization.go:83',
        ],
      },
    ],
  },
]

// Flattened, ordered chapter list for pager / lookup.
export const ALL_CHAPTERS: Chapter[] = PARTS.flatMap((p) => p.chapters)

export function getChapter(slug: string): Chapter | undefined {
  return ALL_CHAPTERS.find((c) => c.slug === slug)
}

export function getPartOf(slug: string): Part | undefined {
  return PARTS.find((p) => p.chapters.some((c) => c.slug === slug))
}

export function getAdjacent(slug: string): { prev?: Chapter; next?: Chapter } {
  const idx = ALL_CHAPTERS.findIndex((c) => c.slug === slug)
  if (idx < 0) return {}
  return {
    prev: idx > 0 ? ALL_CHAPTERS[idx - 1] : undefined,
    next: idx < ALL_CHAPTERS.length - 1 ? ALL_CHAPTERS[idx + 1] : undefined,
  }
}
