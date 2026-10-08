import { useEffect, useRef, useState } from 'preact/hooks'
import { CODE_LENGTH } from '../../config'
import { codeFromText, isCodeChar, normalizeCodeInput } from '../../net/pairing'
import { cx } from '../classes'

/**
 * Six boxes backed by one real input so paste, autofill and screen readers all work.
 * Auto-uppercases, ignores spaces and dashes, shakes on characters outside the alphabet,
 * and submits on the sixth character.
 */
export function CodeBoxes({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  disabled = false,
}: {
  value: string
  onChange: (code: string) => void
  onSubmit: (code: string) => void
  autoFocus?: boolean
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [shake, setShake] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  const apply = (raw: string) => {
    const fromLink = codeFromText(raw)
    if (fromLink) {
      setError(null)
      onChange(fromLink)
      onSubmit(fromLink)
      return
    }
    const cleaned = normalizeCodeInput(raw)
    let next = ''
    let bad = false
    for (const ch of cleaned) {
      if (isCodeChar(ch)) next += ch
      else bad = true
      if (next.length === CODE_LENGTH) break
    }
    if (bad) {
      setError('Codes never use 0, O, 1, I or L')
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
    } else setError(null)
    onChange(next)
    if (next.length === CODE_LENGTH) onSubmit(next)
  }

  const active = Math.min(value.length, CODE_LENGTH - 1)

  return (
    <div class="flex flex-none flex-col gap-2.5">
      <div
        class={cx('relative grid grid-cols-6 gap-2', shake && 'motion-safe:animate-[fb-shake_0.4s_ease]')}
        onClick={() => input.current?.focus()}
      >
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const ch = value[i] ?? ''
          const isActive = focused && i === active && value.length < CODE_LENGTH
          return (
            <div
              key={i}
              class={cx(
                'flex h-15 items-center justify-center rounded-btn bg-surface font-mono text-26 font-bold text-ink',
                isActive ? 'border-2 border-accent' : 'border-[1.5px] border-line',
              )}
              aria-hidden="true"
            >
              {ch || (isActive ? <span class="h-7 w-0.5 bg-button motion-safe:animate-[fb-caret_1s_steps(1)_infinite]" /> : null)}
            </div>
          )
        })}
        <input
          ref={input}
          class="absolute inset-0 size-full cursor-text border-0 text-16 opacity-0"
          type="text"
          inputMode="text"
          autocapitalize="characters"
          autocomplete="one-time-code"
          autocorrect="off"
          spellcheck={false}
          aria-label="6-character code"
          aria-describedby="codeboxes-help"
          value={value}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => apply((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.length === CODE_LENGTH) onSubmit(value)
          }}
        />
      </div>
      <div
        id="codeboxes-help"
        class={cx('min-h-5 text-center text-14', error ? 'font-semibold text-warn-ink' : 'text-muted')}
        role={error ? 'alert' : undefined}
      >
        {error ?? 'Connects as soon as all 6 are in. Case doesn’t matter.'}
      </div>
    </div>
  )
}
