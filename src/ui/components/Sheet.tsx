import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * Bottom sheet (85% height, drag handle, backdrop tap and Esc dismiss). On wide screens it renders as a
 * centred panel instead.
 */
export function Sheet({
  label,
  onClose,
  children,
  tall = true,
}: {
  label: string
  onClose: () => void
  children: ComponentChildren
  tall?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [dragY, setDragY] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    const el = ref.current
    const prev = document.activeElement as HTMLElement | null
    const first = el?.querySelector<HTMLElement>('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])')
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  const onPointerDown = (e: PointerEvent) => {
    start.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (start.current === null) return
    setDragY(Math.max(0, e.clientY - start.current))
  }
  const onPointerUp = () => {
    if (start.current === null) return
    const y = dragY
    start.current = null
    setDragY(0)
    if (y > 120) onClose()
  }

  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        class={`sheet${tall ? ' sheet--tall' : ''}`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          class="sheet-handle"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span />
        </div>
        {children}
      </section>
    </div>
  )
}
