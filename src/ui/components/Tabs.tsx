import { cx } from '../classes'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  tone = 'ground',
}: {
  tabs: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  tone?: 'ground' | 'chip'
}) {
  return (
    <div role="tablist" aria-label={label} class={cx(
        'grid flex-none auto-cols-[minmax(0,1fr)] grid-flow-col gap-1 rounded-btn p-1',
        tone === 'chip' ? 'bg-chip' : 'bg-ground',
      )}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          class="h-10 rounded-[10px] text-15 font-semibold text-muted aria-selected:bg-surface aria-selected:font-bold aria-selected:text-ink aria-selected:shadow-raised"
          role="tab"
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              const i = tabs.findIndex((x) => x.value === value)
              const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
              if (next) onChange(next.value)
            }
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
