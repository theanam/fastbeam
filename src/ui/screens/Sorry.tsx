import { dismissSorry, joinWithCode, sorry } from '../../net/pairing'
import { device } from '../../state/identity'
import { hasPending, openPairSheet } from '../../state/ui'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { CloseIcon, DeviceIcon, LaptopIcon } from '../components/Icons'
import { onPairedDefault } from '../sheets/pairActions'
import { badge, badgeTone, card, cx, screen, screenTitle } from '../classes'

const node =
  'inline-flex size-16 flex-none items-center justify-center rounded-full border border-line bg-surface text-muted'
const stepRow = 'flex items-start gap-3 text-15 leading-[1.45]'
const stepN =
  'inline-flex size-7 flex-none items-center justify-center rounded-full bg-tint text-14 font-bold text-link'

/** Screen 11. */
export function Sorry() {
  const s = sorry.value
  if (!s) return null
  const cause =
    s.cause === 'symmetric'
      ? 'Your network limits direct connections'
      : s.cause === 'udp-blocked'
        ? 'Your network blocks direct connections'
        : null
  const title =
    s.reason === 'auth'
      ? 'Couldn’t verify the other device'
      : s.reason === 'rotated'
        ? 'That code has been reset'
        : s.reason === 'expired'
          ? 'That code has already been used'
          : 'Couldn’t connect directly'
  const copy =
    s.reason === 'auth'
      ? 'The password check failed in a way that suggests something sat between the two devices. Get a fresh code and try again on the same Wi‑Fi.'
      : s.reason === 'rotated'
        ? 'Too many wrong passwords, so the other device made a new code. Ask for the new one.'
        : s.reason === 'expired'
          ? 'Codes and links work once. Another device already connected with this one, so the other device is showing a new code now. Ask for that one.'
          : 'fastbeam only sends files device‑to‑device, and these two networks won’t allow a direct link.'
  return (
    <div class={screen}>
      <header class="flex min-h-11 items-center justify-end gap-2">
        <IconButton label="Close" round onClick={dismissSorry}>
          <CloseIcon />
        </IconButton>
      </header>
      <div class="mx-auto flex w-[280px] max-w-full items-center" aria-hidden="true">
        <span class={node}>
          <DeviceIcon type={device.deviceType} size={28} />
        </span>
        <span class="flex flex-1 items-center gap-2.5 px-2">
          <i class="h-1 flex-1 rounded-[2px] bg-accent" />
          <i class="inline-flex size-7 flex-none items-center justify-center rounded-full bg-warn-bg text-warn-ink">
            <CloseIcon size={16} strokeWidth={2.6} />
          </i>
          <i class="h-1 flex-1 rounded-[2px] bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_12px)]" />
        </span>
        <span class={node}>
          <LaptopIcon size={28} />
        </span>
      </div>
      <div class="flex flex-col gap-2.5">
        <h1 class={screenTitle.replace('text-center', 'text-left')}>{title}</h1>
        <p class="text-left text-16 leading-normal text-body text-pretty">{copy}</p>
        {cause && s.reason === 'timeout' && <span class={cx(badge, badgeTone.warn)}>{cause}</span>}
      </div>
      {s.reason !== 'expired' && (
      <section class={cx(card, 'flex flex-col gap-3.5 p-4')}>
        <div class="text-13 font-bold tracking-[0.06em] uppercase text-link">This always works</div>
        <div class={stepRow}>
          <span class={stepN}>1</span>
          <span>
            Put both devices on the same Wi‑Fi, <strong>or</strong> turn on one phone&rsquo;s hotspot and join it from the other.
          </span>
        </div>
        <div class={stepRow}>
          <span class={stepN}>2</span>
          <span>Reopen fastbeam on both. They&rsquo;ll find each other on their own — no code needed.</span>
        </div>
      </section>
      )}
      <div class="mt-auto flex flex-col gap-2.5">
        {s.reason !== 'expired' && (
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            dismissSorry()
            joinWithCode(s.code, { intent: hasPending(), onPaired: onPairedDefault })
          }}
        >
          Try again
        </Button>
        )}
        {s.reason === 'expired' && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              dismissSorry()
              openPairSheet('scan')
            }}
          >
            Enter the new code
          </Button>
        )}
        <Button
          variant="quiet"
          onClick={() => {
            dismissSorry()
            openPairSheet('scan', s.code)
          }}
        >
          Check the code
        </Button>
      </div>
    </div>
  )
}
