import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'

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

// Stock wording shared by the register and inventory. Always words, never colour alone.
export const stockOf = (p) =>
  p.kind === 'service'
    ? { key: 'service', label: 'Service', tone: 'text-smoke' }
    : p.stock_qty <= 0
      ? { key: 'out', label: 'Out of stock', tone: 'text-crimson' }
      : p.stock_qty <= p.reorder_level
        ? { key: 'low', label: `Low · ${p.stock_qty} left`, tone: 'text-[#7A5A00]' }
        : { key: 'ok', label: `${p.stock_qty} in stock`, tone: 'text-smoke' }

export const fmtDateTime = (t) =>
  new Date(t).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Segmented control with a sliding pill; `id` must be unique on the page.
export function Segmented({ id, options, value, onChange, dark = false, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-lg p-1 ${dark ? 'bg-ink-2' : 'bg-mist'} ${className}`}>
      {options.map(([v, label, Icon]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className="press relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold whitespace-nowrap">
          {value === v && <motion.span layoutId={id} className={`absolute inset-0 rounded-md ${dark ? 'bg-gold' : 'bg-paper shadow-[0_1px_3px_rgb(25_23_27/0.15)]'}`} transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }} />}
          {Icon && <Icon className="relative size-4" aria-hidden="true" />}
          <span className={`relative transition-colors duration-150 ${value === v ? 'text-ink' : dark ? 'text-ash' : 'text-smoke'}`}>{label}</span>
        </button>
      ))}
    </div>
  )
}
