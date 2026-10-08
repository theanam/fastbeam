import { useEffect, useState } from 'preact/hooks'
import { STILL_LOOKING_MS } from '../../../config'
import { CheckIcon, DeviceIcon, WifiIcon } from '../../components/Icons'

/** Screen 1. */
export function Looking() {
  const [stillLooking, setStillLooking] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setStillLooking(true), STILL_LOOKING_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <section class="looking" aria-label="Looking for devices">
      <div class="pulse" aria-hidden="true">
        <div class="pulse-ring" />
        <div class="pulse-ring" />
        <div class="pulse-ring" />
        <div class="pulse-core" />
        <div class="pulse-self">
          <WifiIcon size={30} />
        </div>
      </div>
      <div class="looking-text">
        <h2 class="looking-title">{stillLooking ? 'Still looking' : 'Looking for devices'}</h2>
        <p class="home-hint" aria-live="polite">
          {stillLooking ? (
            <>Different Wi‑Fi? Use a code instead.</>
          ) : (
            <>
              Open <strong>fastbeam.app</strong> on the other device, on this same Wi‑Fi.
            </>
          )}
        </p>
      </div>
      <ol class="howto" aria-label="How it works">
        <li>
          <span class="howto-icon" aria-hidden="true">
            <WifiIcon size={20} />
          </span>
          <span>Open fastbeam on both devices</span>
        </li>
        <li>
          <span class="howto-icon" aria-hidden="true">
            <DeviceIcon type="phone" size={20} />
          </span>
          <span>Pick the other device when it appears</span>
        </li>
        <li>
          <span class="howto-icon" aria-hidden="true">
            <CheckIcon size={20} />
          </span>
          <span>They accept, and it goes straight across</span>
        </li>
      </ol>
    </section>
  )
}
