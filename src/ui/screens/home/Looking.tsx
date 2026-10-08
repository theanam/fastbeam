import { useEffect, useState } from 'preact/hooks'
import { STILL_LOOKING_MS } from '../../../config'
import { CheckIcon, DeviceIcon, WifiIcon } from '../../components/Icons'

const step =
  'flex items-center gap-3 rounded-btn border border-line-soft bg-surface py-2 pr-3 pl-2 text-14 font-semibold text-body desk:flex-col desk:items-start desk:gap-2.5 desk:p-3.5'
const stepIcon = 'inline-flex size-8 flex-none items-center justify-center rounded-[10px] bg-tint text-link desk:size-9'

/** Screen 1. */
export function Looking() {
  const [stillLooking, setStillLooking] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setStillLooking(true), STILL_LOOKING_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <section
      class="flex flex-1 flex-col items-center justify-center gap-3.5 rounded-tile border border-dashed border-line bg-sunken px-3.5 py-5 text-center desk:gap-5 desk:px-7 desk:py-10"
      aria-label="Looking for devices"
    >
      {/* Concentric pulse around your own device; static rings under reduced motion. */}
      <div
        class="relative flex size-[150px] max-h-[60vw] max-w-[60vw] items-center justify-center desk:size-[200px]"
        aria-hidden="true"
      >
        <div class="absolute inset-0 rounded-full border-2 border-accent opacity-0 motion-safe:animate-[fb-pulse_2.4s_ease-out_infinite] motion-reduce:opacity-25" />
        <div class="absolute inset-0 rounded-full border-2 border-accent opacity-0 motion-safe:animate-[fb-pulse_2.4s_ease-out_infinite] motion-reduce:opacity-25 motion-safe:[animation-delay:0.8s] motion-reduce:inset-[14%]" />
        <div class="absolute inset-0 rounded-full border-2 border-accent opacity-0 motion-safe:animate-[fb-pulse_2.4s_ease-out_infinite] motion-reduce:opacity-25 motion-safe:[animation-delay:1.6s] motion-reduce:inset-[28%] motion-reduce:opacity-40" />
        <div class="absolute inset-[27%] rounded-full bg-tint" />
        <div class="relative flex size-15 items-center justify-center rounded-full border border-line bg-surface text-link shadow-soft desk:size-[72px]">
          <WifiIcon size={30} />
        </div>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <h2 class="m-0 font-display text-22 font-bold tracking-title text-ink">{stillLooking ? 'Still looking' : 'Looking for devices'}</h2>
        <p class="max-w-[34ch] text-16 leading-[1.45] text-body text-pretty" aria-live="polite">
          {stillLooking ? (
            <>Different Wi‑Fi? Use a code instead.</>
          ) : (
            <>
              Open <strong>fastbeam.app</strong> on the other device, on this same Wi‑Fi.
            </>
          )}
        </p>
      </div>
      <ol
        class="m-0 mt-1 grid w-full max-w-[640px] list-none gap-2 p-0 text-left desk:grid-cols-3 desk:gap-2.5"
        aria-label="How it works"
      >
        <li class={step}>
          <span class={stepIcon} aria-hidden="true">
            <WifiIcon size={20} />
          </span>
          <span>Open fastbeam on both devices</span>
        </li>
        <li class={step}>
          <span class={stepIcon} aria-hidden="true">
            <DeviceIcon type="phone" size={20} />
          </span>
          <span>Pick the other device when it appears</span>
        </li>
        <li class={step}>
          <span class={stepIcon} aria-hidden="true">
            <CheckIcon size={20} />
          </span>
          <span>They accept, and it goes straight across</span>
        </li>
      </ol>
    </section>
  )
}
