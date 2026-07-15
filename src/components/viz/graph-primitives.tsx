import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type NodeState = 'idle' | 'active' | 'done' | 'danger'

const FILL: Record<NodeState, string> = {
  idle: 'var(--color-viz-node)',
  active: 'var(--color-viz-node-active)',
  done: 'var(--color-viz-node-done)',
  danger: 'var(--color-viz-danger)',
}

const STROKE: Record<NodeState, string> = {
  idle: 'var(--color-viz-edge)',
  active: 'var(--color-viz-node-active)',
  done: 'var(--color-viz-node-done)',
  danger: 'var(--color-viz-danger)',
}

/** A rounded-rectangle graph node with a label, state-driven coloring. */
export function GraphNode({
  x,
  y,
  w = 132,
  h = 46,
  label,
  sub,
  state = 'idle',
}: {
  x: number
  y: number
  w?: number
  h?: number
  label: string
  sub?: string
  state?: NodeState
}) {
  const filled = state === 'active' || state === 'done' || state === 'danger'
  const textColor = filled ? 'oklch(0.99 0.01 200)' : 'var(--color-foreground)'
  return (
    <g style={{ transition: 'opacity 0.3s' }}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={10}
        fill={FILL[state]}
        stroke={STROKE[state]}
        strokeWidth={state === 'idle' ? 1.25 : 2}
        style={{ transition: 'fill 0.35s, stroke 0.35s' }}
      />
      <text
        x={x}
        y={sub ? y - 4 : y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        fill={textColor}
        style={{ transition: 'fill 0.35s' }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x}
          y={y + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill={filled ? 'oklch(0.99 0.01 200 / 0.8)' : 'var(--color-muted-foreground)'}
          style={{ transition: 'fill 0.35s' }}
        >
          {sub}
        </text>
      )}
    </g>
  )
}

/** A directed edge between two points, optionally highlighted/animated. */
export function GraphEdge({
  d,
  active = false,
  dashed = false,
  label,
  labelX,
  labelY,
}: {
  d: string
  active?: boolean
  dashed?: boolean
  label?: string
  labelX?: number
  labelY?: number
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={active ? 'var(--color-viz-node-active)' : 'var(--color-viz-edge)'}
        strokeWidth={active ? 2.5 : 1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
        markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow-idle)'}
        style={{ transition: 'stroke 0.35s, stroke-width 0.35s' }}
      />
      {label && labelX != null && labelY != null && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={10}
          fill={active ? 'var(--color-viz-node-active)' : 'var(--color-muted-foreground)'}
          style={{ transition: 'fill 0.35s' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

/** Arrowhead marker defs; include once per SVG. */
export function ArrowDefs() {
  return (
    <defs>
      <marker
        id="arrow-idle"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-viz-edge)" />
      </marker>
      <marker
        id="arrow-active"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-viz-node-active)" />
      </marker>
    </defs>
  )
}

/**
 * A data payload traveling along a wire. Given the two endpoints and a progress
 * value (0→1), it positions a labeled pill at the interpolated point so readers
 * can literally see *what* moves between nodes, not just that an edge lit up.
 * `progress` is driven by the step player (or a CSS transition) so the packet
 * glides as steps advance.
 */
export function FlowPacket({
  from,
  to,
  progress,
  label,
  tone = 'active',
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  progress: number
  label: string
  tone?: 'active' | 'done' | 'danger'
}) {
  const p = Math.max(0, Math.min(1, progress))
  const x = from.x + (to.x - from.x) * p
  const y = from.y + (to.y - from.y) * p
  const fill =
    tone === 'danger'
      ? 'var(--color-viz-danger)'
      : tone === 'done'
        ? 'var(--color-viz-node-done)'
        : 'var(--color-viz-node-active)'
  // Pill width scales with label length for a snug fit.
  const w = Math.max(38, label.length * 7 + 16)
  return (
    <g style={{ transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' }} transform={`translate(${x} ${y})`}>
      <rect
        x={-w / 2}
        y={-11}
        width={w}
        height={22}
        rx={11}
        fill={fill}
        stroke="var(--color-background)"
        strokeWidth={1.5}
      >
        <animate attributeName="opacity" values="0.85;1;0.85" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10.5}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="oklch(0.99 0.01 200)"
      >
        {label}
      </text>
    </g>
  )
}

/** Responsive SVG canvas wrapper with a consistent viewBox aspect. */
export function VizCanvas({
  viewBox,
  children,
  className,
}: {
  viewBox: string
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox={viewBox}
      className={cn('h-auto w-full', className)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      {children}
    </svg>
  )
}
