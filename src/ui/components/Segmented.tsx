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
    <div role="radiogroup" aria-label={label} class="seg">
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            key={o.value}
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
