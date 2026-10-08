import { toasts } from '../../state/toast'

export function Toasts() {
  return (
    <div
      class="pointer-events-none fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2"
      aria-live="polite" aria-atomic="false">
      {toasts.value.map((t) => (
        <div
          class="max-w-[420px] rounded-btn bg-toast-bg px-4 py-3 text-14 font-semibold text-toast-ink shadow-soft motion-safe:animate-toast"
          key={t.id}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
