import * as React from 'react'

export interface StepPlayerOptions {
  /** Total number of steps in the sequence. */
  count: number
  /** Autoplay interval in ms. */
  intervalMs?: number
  /** Whether autoplay loops back to the start after the last step. */
  loop?: boolean
}

export interface StepPlayer {
  step: number
  isPlaying: boolean
  atStart: boolean
  atEnd: boolean
  next: () => void
  prev: () => void
  reset: () => void
  toggle: () => void
  goTo: (n: number) => void
}

/**
 * Shared driver for every mechanism animation. Holds the current step index and
 * an optional autoplay timer, exposing a small imperative API the controls and
 * each viz render against. Kept deliberately headless so visuals stay decoupled
 * from playback logic.
 */
export function useStepPlayer({
  count,
  intervalMs = 1400,
  loop = false,
}: StepPlayerOptions): StepPlayer {
  const [step, setStep] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)

  const atStart = step === 0
  const atEnd = step === count - 1

  const goTo = React.useCallback(
    (n: number) => setStep(Math.max(0, Math.min(count - 1, n))),
    [count],
  )
  const next = React.useCallback(() => {
    setStep((s) => {
      if (s < count - 1) return s + 1
      return loop ? 0 : s
    })
  }, [count, loop])
  const prev = React.useCallback(() => setStep((s) => Math.max(0, s - 1)), [])
  const reset = React.useCallback(() => {
    setStep(0)
    setIsPlaying(false)
  }, [])
  const toggle = React.useCallback(() => setIsPlaying((p) => !p), [])

  React.useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s < count - 1) return s + 1
        if (loop) return 0
        // Reached the end without looping: stop.
        setIsPlaying(false)
        return s
      })
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [isPlaying, count, intervalMs, loop])

  return { step, isPlaying, atStart, atEnd, next, prev, reset, toggle, goTo }
}
