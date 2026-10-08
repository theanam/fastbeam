import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { cx } from '../classes'

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
    <div
      class="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(10,20,21,0.48)] desk:items-center desk:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        class={cx(
          'flex max-h-[92dvh] w-full flex-col gap-4 overflow-hidden rounded-t-sheet bg-surface px-5 text-ink',
          'pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.18)]',
          'transition-transform duration-160 ease-[ease] motion-safe:animate-[fb-sheet-in_220ms_ease-out]',
          'desk:max-h-[calc(100dvh-48px)] desk:max-w-[480px] desk:rounded-sheet desk:pb-5',
          tall && 'h-[85dvh] desk:h-auto desk:min-h-[min(680px,calc(100dvh-48px))]',
        )}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          class="flex flex-none cursor-grab touch-none justify-center pt-2.5 pb-0.5"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span class="h-[5px] w-10 rounded-[3px] bg-line" />
        </div>
        {children}
      </section>
    </div>
  )
}
