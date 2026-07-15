# GOAL · 打造一套完整的 Eino v0.9「ADK 优先」交互式教程

> 单一事实来源（Single Source of Truth）。所有后续写作 / 开发都对齐本文件的
> 目标（Goal）、完成定义（DoD）与执行顺序（Roadmap）。章节结构以
> `src/content/chapters.ts` 为准，本文件负责“把它写完 + 做完”。

## 1. 愿景（Vision）

用「先会用 → 再懂设计 → 再看实现 → 再下沉引擎 → 最后工程落地」的路径，
带读者从**上手 ADK** 一路走到**读懂 Eino 背后的 Agent 设计哲学**。
每一章都遵循同一契约：**实战案例驱动 + 源码逐段对照 + 机制可视化 + 可交互**。

一句话目标：**任何一个 Go 工程师，读完这套教程后，既能用 ADK 搭出生产级
Agent，也能讲清 Eino“为什么这样设计”。**

## 2. 完成定义（Definition of Done，可度量）

教程视为“完整”当且仅当下列全部成立：

| # | 验收项 | 度量标准 |
|---|--------|----------|
| D1 | 章节全部成文 | 28 章 `status: 'written'`，`src/content/{zh,en}/<slug>.mdx` 各 28 份，无 placeholder 兜底渲染 |
| D2 | 双语对齐 | 每章 zh + en 内容在小节结构、代码块、SourceRef 上一一对应 |
| D3 | 源码对照 | 每章 `sources[]` 锚点全部可被 `scripts/gen-source-snippets.mjs` 解析（0 个 missing anchor，目录型锚点显式下钻到文件+行号） |
| D4 | 页内源码预览 | 每个 SourceRef 都能在页内打开 Shiki 高亮预览，且“View on GitHub”链接指向真实行号 |
| D5 | 机制可视化 | 5 个旗舰可视化（react-loop / agent-tool-vs-transfer / runnable-paradigm / checkpoint-resume / fan-in-fan-out）在其归属章节可交互、数据流清晰；缺可视化的关键机制章补齐静态图示（Mermaid/SVG） |
| D6 | 构建健康 | `pnpm typecheck` 干净；`pnpm build` 干净；prerender 页数 = 2×(28 章 + 首页 + Part 索引) 且无运行时报错 |
| D7 | 可导航 | 侧边栏、prev/next pager、Part 概览、语言切换在全部 28 章可用 |
| D8 | 设计哲学显性化 | 每个 Part 末尾有“设计取舍复盘”，把 Eino 的取舍（如 transfer vs agent-as-tool、Pregel vs DAG、中断为一等公民）讲透 |

## 3. 每章统一写作契约（Chapter Contract）

每章 MDX 必须包含（按顺序）：

1. **一句话钩子** —— 这一章要解决的真实问题 / 反直觉点。
2. **最小可跑实战** —— 一段能编译运行的示例，先给结果再拆解。
3. **源码对照** —— 用 `<SourceRef>` 指到真实文件行号，逐段讲“框架内部发生了什么”。
4. **机制图示** —— 旗舰可视化或 Mermaid/SVG，把控制流 / 数据流 / 状态流讲清。
5. **设计意图** —— 这段实现体现了什么设计哲学、放弃了什么、为什么。
6. **小结 + 通向下一章** —— 承上启下。

## 4. 现状快照（2026-07-14）

- 结构：5 Parts / 28 章已在 `chapters.ts` 定稿（ADK 优先顺序，**锁定不回退**）。2026-07-14
  新增 3 章深度内容并全局重编号：Ch17 `context-harness-loop`（Context/Harness/Loop 三引擎映射，
  Part III 末）、Ch22 `fan-in-fan-out`（扇出扇入的两端 + 第 5 个旗舰交互 viz，Part IV）、
  Ch28 `agent-runtime-in-go`（Agent Runtime 长在 Go 原生机制上，全书收尾）。
- 已成文（28，**全部完成**）：Part I 第 1–7 章 + Part II 第 8–12 章 + Part III 第 13–17 章 +
  Part IV 第 18–23 章 + Part V 第 24–28 章全成文；`chapters.ts` 中 **28/28 `status: 'written'`**，
  无 placeholder 兜底渲染。
- 待成文（0）：全书正文已闭合。
- 基础设施：✅ 5 个交互可视化、✅ 页内 Shiki 源码预览（长行可横向滚动）、✅ 构建期源码片段提取、
  ✅ 双语路由、✅ 构建通过。
- **M0 进展**：✅ D3 达成——目录型锚点已全部下钻到文件+行号；graphtool 锚点已修正到
  `eino-examples` 仓库。
- **M1 进展**：✅ 第 1–7 章 zh+en 全部成文；Ch5 配 `checkpoint-resume`、Ch7 配
  `agent-tool-vs-transfer` viz。
- **M2 进展**：✅ 第 8–12 章 zh+en 全部成文并翻 `status: 'written'`；`gen-source-snippets`
  报告 **107/107 anchors，0 missing**；typecheck 干净、build 干净。
- **M3 进展**：✅ 第 13/15/16 章 zh+en 全部成文并翻 `status: 'written'`（第 14 章此前已成文）；
  Ch13 讲 Runner/flowAgent 骨架，Ch15 配 `checkpoint-resume` viz 讲 TurnLoop/取消/中断双层
  checkpoint，Ch16 配 `agent-tool-vs-transfer` viz 讲控制流隔离（吞 Exit/Transfer、穿透
  Interrupt）；`gen-source-snippets` 报告 **164/164 anchors，0 missing**；typecheck 干净、
  build 干净（53 页 prerender 通过）。
- **M4 进展**：✅ 第 17–21 章 zh+en 全部成文（第 17/21 章此前已成文，本轮补齐 18/19/20）；
  Ch18 讲 Pregel/DAG 同一 run 循环换 channel 切语义，Ch19 讲 Graph/Chain/Workflow 共享类型
  底座 + 两道校验闸门，Ch20 讲流的读时复制 Copy / 按到达顺序 Merge / 装箱拆箱 / state 按类型
  逐级上溯；`gen-source-snippets` 报告 **213/213 anchors，0 missing**；typecheck 干净、build
  干净（53 页 prerender 通过）。
- **M5 进展**：✅ 第 22–25 章 zh+en 全部成文并翻 `status: 'written'`；Ch22 讲把 Chain/Graph/
  Workflow 编排包装成 GraphTool + 两层嵌套中断，Ch23 讲 eino_assistant 的知识索引 + ReAct 服务 +
  Redis 记忆 + Web UI 全流程 RAG，Ch24 讲 callback 五时机切面 → Langfuse/APMPlus/CozeLoop 换 handler
  换后端 + 编译期回调出 Mermaid，Ch25 深读 deer-go 八智能体研究图（图套图 + AnyPredecessor 循环 +
  Goto 黑板路由 + 可序列化 State 中断恢复）并对比 manus/Excel-Agent，收束全书 Agent 设计哲学；
  `gen-source-snippets` 报告 **255/255 anchors，0 missing**；typecheck 干净、build 干净（53 页
  prerender 通过）。
- **D5 静态图示增强（2026-07-14）**：✅ 已为此前无任何可视化元素的 16 章各补一张忠实反映本章
  内容的 `<Mermaid>` 图（zh+en 双语，语言中立标识符 + 本地化标题，不破坏双语结构对齐）。新增
  `<Mermaid>` 组件走客户端惰性渲染（动态 `import('mermaid')`、随主题切换重绘、SSR 期回退占位），
  build 时 mermaid 被 code-split 成独立 `mermaid.core-*.js` 惰性 chunk，prerender 全程安全。
  至此五旗舰交互 viz + 16 张机制 Mermaid 图共同覆盖全部关键机制章，D5 完成。

- **M6 进展**：✅ 终检通过——D1 **25/25 `status: 'written'`**、zh/en 各 25 份 MDX、无 placeholder
  兜底渲染；D2 全 25 章双语在 H2 小节 / 代码块 / SourceRef / Callout 上一一对应（本轮修正
  composition-philosophy、graph-checkpoint-resume、react-is-a-graph、giving-agents-tools、
  runnable-four-paradigms 五章此前缺失的收尾节 / 动手 Callout / 内联锚点）;D3 `gen-source-snippets`
  报告 **255/255 anchors，0 missing**、无目录型锚点;D4 页内 Shiki 源码预览可展开、GitHub 链接带真实
  行号;D5 四旗舰 viz（react-loop / agent-tool-vs-transfer / runnable-paradigm / checkpoint-resume）
  在归属章可交互;D6 typecheck 干净、build 干净、**53 页 prerender**（25 章 ×2 语言 + `/` + `/zh` +
  `/en`，Part 概览并入语言首页）;D7 侧边栏 / pager / Part 概览 / 语言切换全量可用;D8 每章均有
  `kind="key"` 设计钥匙、Part V 末尾做全书设计哲学复盘。**全书正文闭合，可发布。**

- **深度内容扩章 + 预览滚动修复（2026-07-14）**：✅ 依据反馈新增 3 章并全局重编号（25→28）：
  Ch17 `context-harness-loop`（Mermaid 三引擎映射图）、Ch22 `fan-in-fan-out`（新增第 5 个旗舰交互
  viz `fan-in-fan-out`，复用 `useStepPlayer`+`VizStage`，6 步演示扇出 copyItem/copy-on-read 与扇入
  mergeValues/触发门控）、Ch28 `agent-runtime-in-go`（Mermaid 五支柱图）。三章 zh+en 双语结构对齐，
  每个 `<SourceRef>` 均下钻到 eino 源码文件+行号。同时修复页内源码预览（`<SourceRef>` 弹窗）长代码
  行无法横向滚动的 CSS bug——`.source-preview .shiki code` 补齐 `width: max-content; min-width: 100%`，
  与正文 `.prose-doc pre code` 规则对齐。全书章数 25→28、旗舰 viz 4→5、prerender 53→59。

## 5. 执行路线（Roadmap，按依赖排序）

> 原则：先补“已有 viz 但没正文”的章（投入产出比最高），再按 Part 顺序推进；
> 每完成一章即翻 `status: 'written'` 并跑 D6 校验。

- **M0 · 收口基础设施**：把 D3 的目录型锚点全部下钻到文件+行号；补齐缺 viz 关键章的静态图示占位。 ✅
- **M1 · Part I 全成文（第 1–7 章）**：ADK 的使用主线跑通，读者“半天上手”。 ✅
- **M2 · Part II 全成文（第 8–12 章）**：设计哲学正文，组合哲学之争为高潮。 ✅
- **M3 · Part III 全成文（第 13–16 章）**：打开引擎盖，中断/取消/续跑实现。 ✅
- **M4 · Part IV 全成文（第 17–21 章）**：下沉 compose 引擎基座。 ✅
- **M5 · Part V 全成文（第 22–25 章）**：Capstone 与工程化落地 + 全书设计复盘。 ✅
- **M6 · 终检**：逐条核对 D1–D8，跑全量构建，产出可发布静态站点。 ✅

## 6. 里程碑度量

| 里程碑 | 完成信号 |
|--------|----------|
| M0 | `gen-source-snippets` 0 missing anchor；所有机制章至少有占位图示 |
| M1 | 第 1–7 章 zh+en 成文，Part I 概览可读，构建干净 |
| M2 | 第 8–12 章成文；第 9 章“组合哲学”配 agent-tool-vs-transfer viz |
| M3 | 第 13–16 章成文；中断/取消状态机图示到位 |
| M4 | 第 17–21 章成文；Pregel/DAG、流机制、checkpoint 图示到位 |
| M5 | 第 22–25 章成文；至少 1 个端到端 Capstone 可复现 |
| M6 | 25/25 written，D1–D8 全绿，`pnpm build` 产出发布物 |

---
_维护：每完成一章更新第 4 节现状；DoD/Roadmap 变更需在本文件留痕。_
