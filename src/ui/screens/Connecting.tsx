import { useEffect, useState } from 'preact/hooks'
import { cancelJoin, formatCode, joining } from '../../net/pairing'
import { device } from '../../state/identity'
import { Button } from '../components/Button'
import { CheckIcon, DeviceIcon, LaptopIcon } from '../components/Icons'
import { codechip, cx, mono, screen, screenHead, screenTitle } from '../classes'

type Step = 'done' | 'active' | 'idle'

const node =
  'inline-flex size-[72px] flex-none items-center justify-center rounded-full border border-line bg-surface text-link'
const spin = 'block size-[26px] rounded-full border-[3px] border-tint border-t-accent motion-safe:animate-spin'

/** Checklist line: muted until it is the current or a finished step. */
const item = (s: Step) =>
  cx(
    'flex min-h-13 items-center gap-3 border-b border-line-soft text-16 last:border-b-0',
    s === 'idle' ? 'text-muted' : 'text-ink',
    s === 'active' && 'font-semibold',
  )

const check = (s: Step) =>
  cx(
    'inline-flex size-[26px] flex-none items-center justify-center rounded-full',
    s === 'done' && 'border-2 border-accent bg-accent text-on-button',
    s === 'active' && 'border-0',
    s === 'idle' && 'border-2 border-line',
  )

function useElapsed(since: number): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((now - since) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Screen 10. */
export function Connecting() {
  const j = joining.value
  const elapsed = useElapsed(j?.startedAt ?? Date.now())
  if (!j) return null
  const found = j.step !== 'finding'
  const who = j.hostName ?? 'the other device'
  const last: Step = found && (!j.locked || j.passwordChecked) ? 'active' : 'idle'
  return (
    <div class={screen}>
      <header class={screenHead}>
        <span class={codechip}>{formatCode(j.code)}</span>
        <span class={cx(mono, 'text-muted')} aria-label={`Elapsed ${elapsed}`}>
          {elapsed}
        </span>
      </header>
      <div class="mx-auto mt-6 flex w-[300px] max-w-full items-center" aria-hidden="true">
        <span class={node}>
          <DeviceIcon type={device.deviceType} size={30} />
        </span>
        <span class="relative h-1 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_12px)]">
          <i class="absolute -top-0.5 left-0 h-2 w-10 rounded-[4px] bg-accent shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] motion-safe:animate-[fb-travel_1.4s_ease-in-out_infinite] motion-reduce:left-[calc(50%-20px)]" />
        </span>
        <span class={node}>
          <LaptopIcon size={30} />
        </span>
      </div>
      <h1 class={screenTitle}>Connecting to {who}</h1>
      <ol class="m-0 flex list-none flex-col rounded-tile border border-line bg-surface px-4 py-2" aria-live="polite">
        <li class={item(found ? 'done' : 'active')}>
          <span class={check(found ? 'done' : 'active')}>{found ? <CheckIcon /> : <i class={spin} />}</span>
          Found the other device
        </li>
        {j.locked && (
          <li class={item(j.passwordChecked ? 'done' : 'active')}>
            <span class={check(j.passwordChecked ? 'done' : 'active')}>
              {j.passwordChecked ? <CheckIcon /> : <i class={spin} />}
            </span>
            Password checked
          </li>
        )}
        <li class={item(last)}>
          <span class={check(last)}>{last === 'active' ? <i class={spin} /> : null}</span>
          Opening a direct link…
        </li>
      </ol>
      <Button variant="secondary" class="mt-auto" onClick={cancelJoin}>
        Cancel
      </Button>
    </div>
  )
}
