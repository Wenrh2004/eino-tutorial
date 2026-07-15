import type { ReactNode } from 'react'
import { Info, Lightbulb, TriangleAlert, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalloutKind = 'note' | 'tip' | 'warning' | 'key'

const CONFIG: Record<
  CalloutKind,
  { icon: typeof Info; className: string; iconClassName: string }
> = {
  note: {
    icon: Info,
    className: 'border-primary/30 bg-primary/5',
    iconClassName: 'text-primary',
  },
  tip: {
    icon: Lightbulb,
    className: 'border-viz-node-done/40 bg-viz-node-done/8',
    iconClassName: 'text-viz-node-done',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-destructive/40 bg-destructive/8',
    iconClassName: 'text-destructive',
  },
  key: {
    icon: Flame,
    className: 'border-primary/50 bg-accent/40',
    iconClassName: 'text-primary',
  },
}

/**
 * Highlighted aside used inside MDX for notes, tips, warnings and — most often
 * in this book — the "design key" that names the mechanism a chapter reveals.
 */
export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: CalloutKind
  title?: ReactNode
  children: ReactNode
}) {
  const { icon: Icon, className, iconClassName } = CONFIG[kind]
  return (
    <div className={cn('my-6 flex gap-3 rounded-lg border p-4', className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconClassName)} />
      <div className="min-w-0 flex-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  )
}
