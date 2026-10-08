export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (next: T) => void
  label: string
}) {
  const onKey = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = options[(index + delta + options.length) % options.length]
    if (!next) return
    onChange(next.value)
    const group = (e.currentTarget as HTMLElement).parentElement
    const btn = group?.querySelectorAll<HTMLButtonElement>('button')[(index + delta + options.length) % options.length]
    btn?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} class="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-ground p-1">
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            key={o.value}
            class="h-10 rounded-[9px] text-14 font-semibold text-muted transition-colors duration-120 aria-checked:bg-surface aria-checked:font-bold aria-checked:text-ink aria-checked:shadow-raised"
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
