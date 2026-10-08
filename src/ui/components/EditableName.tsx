import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { deviceName, NAME_MAX, setDeviceName } from '../../state/settings'
import { PencilIcon } from './Icons'

/** The device name as a tap-to-edit heading (screens 1 and 2). */
export function EditableName() {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const committed = useRef(false)

  // Layout effect: focus must land before the next keystroke, not after the next paint.
  useLayoutEffect(() => {
    if (!editing) return
    committed.current = false
    const el = inputRef.current
    el?.focus()
    el?.select()
  }, [editing])

  const start = () => {
    setDraft(deviceName.value)
    setEditing(true)
  }

  const commit = () => {
    if (committed.current) return
    committed.current = true
    setDeviceName(draft) // empty input keeps the old name
    setEditing(false)
  }

  const cancel = () => {
    committed.current = true
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        class="min-h-11 w-[min(100%,360px)] rounded-none border-0 border-b-2 border-current bg-transparent py-0.5 text-left font-display text-26 leading-[1.1] font-bold tracking-display text-inherit outline-none desk:text-34"
        type="text"
        aria-label="Device name"
        value={draft}
        maxLength={NAME_MAX}
        autocomplete="off"
        autocapitalize="words"
        enterkeyhint="done"
        onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') cancel()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      class="-ml-2 inline-flex min-h-11 max-w-[calc(100%+8px)] items-center gap-2 rounded-xl px-2 py-0.5 text-left font-display text-26 leading-[1.1] font-bold tracking-display text-inherit transition-colors duration-160 ease-fb hover:bg-[color-mix(in_srgb,var(--color-on-button)_14%,transparent)] desk:text-34 [&>span]:wrap-anywhere [&>svg]:flex-none"
      onClick={start}
      aria-label={`Device name: ${deviceName.value}. Tap to edit`}
    >
      <span>{deviceName.value}</span>
      <PencilIcon />
    </button>
  )
}
