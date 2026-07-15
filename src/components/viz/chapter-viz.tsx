import type { Locale } from '@/lib/i18n'
import type { Chapter } from '@/content/chapters'
import { ReactLoopViz } from './react-loop-viz'
import { AgentToolVsTransferViz } from './agent-tool-vs-transfer-viz'
import { RunnableParadigmViz } from './runnable-paradigm-viz'
import { CheckpointResumeViz } from './checkpoint-resume-viz'
import { FanInFanOutViz } from './fan-in-fan-out-viz'

type VizKey = NonNullable<Chapter['viz']>

const REGISTRY: Record<VizKey, (props: { locale: Locale }) => React.ReactElement> = {
  'react-loop': ReactLoopViz,
  'agent-tool-vs-transfer': AgentToolVsTransferViz,
  'runnable-paradigm': RunnableParadigmViz,
  'checkpoint-resume': CheckpointResumeViz,
  'fan-in-fan-out': FanInFanOutViz,
}

/** Renders the flagship visualization associated with a chapter, if any. */
export function ChapterViz({ viz, locale }: { viz?: Chapter['viz']; locale: Locale }) {
  if (!viz) return null
  const Comp = REGISTRY[viz]
  return <Comp locale={locale} />
}
