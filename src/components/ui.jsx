import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useMotionValueEvent } from 'motion/react'

export const EASE_OUT = [0.23, 1, 0.32, 1]

// Animates from the previous value to the new one; interruptible because it rides one motion value.
export function CountUp({ value, format = (v) => Math.round(v), duration = 0.5 }) {
  const ref = useRef(null)
  const mv = useMotionValue(value)
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: EASE_OUT })
    return () => c.stop()
  }, [mv, value, duration])
  useMotionValueEvent(mv, 'change', (v) => ref.current && (ref.current.textContent = format(v)))
  return <span ref={ref}>{format(value)}</span>
}
