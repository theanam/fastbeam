import { useEffect, useState } from 'preact/hooks'
import { cancelJoin, formatCode, joining } from '../../net/pairing'
import { device } from '../../state/identity'
import { Button } from '../components/Button'
import { CheckIcon, DeviceIcon, LaptopIcon } from '../components/Icons'

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
  return (
    <div class="screen">
      <header class="screen-head">
        <span class="mono codechip">{formatCode(j.code)}</span>
        <span class="mono muted" aria-label={`Elapsed ${elapsed}`}>
          {elapsed}
        </span>
      </header>
      <div class="connect-art" aria-hidden="true">
        <span class="connect-node">
          <DeviceIcon type={device.deviceType} size={30} />
        </span>
        <span class="connect-track">
          <i class="connect-beam" />
        </span>
        <span class="connect-node">
          <LaptopIcon size={30} />
        </span>
      </div>
      <h1 class="screen-title">Connecting to {who}</h1>
      <ol class="checklist" aria-live="polite">
        <li class={found ? 'is-done' : 'is-active'}>
          <span class="check">{found ? <CheckIcon /> : <i class="spin" />}</span>
          Found the other device
        </li>
        {j.locked && (
          <li class={j.passwordChecked ? 'is-done' : 'is-active'}>
            <span class="check">{j.passwordChecked ? <CheckIcon /> : <i class="spin" />}</span>
            Password checked
          </li>
        )}
        <li class={found && (!j.locked || j.passwordChecked) ? 'is-active' : ''}>
          <span class="check">{found && (!j.locked || j.passwordChecked) ? <i class="spin" /> : null}</span>
          Opening a direct link…
        </li>
      </ol>
      <Button variant="secondary" class="screen-cta" onClick={cancelJoin}>
        Cancel
      </Button>
    </div>
  )
}
