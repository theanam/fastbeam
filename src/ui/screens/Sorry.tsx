import { dismissSorry, joinWithCode, sorry } from '../../net/pairing'
import { device } from '../../state/identity'
import { hasPending, openPairSheet } from '../../state/ui'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { CloseIcon, DeviceIcon, LaptopIcon } from '../components/Icons'
import { onPairedDefault } from '../sheets/pairActions'

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
    <div class="screen">
      <header class="screen-head screen-head--right">
        <IconButton label="Close" class="iconbtn--round" onClick={dismissSorry}>
          <CloseIcon />
        </IconButton>
      </header>
      <div class="sorry-art" aria-hidden="true">
        <span class="sorry-node">
          <DeviceIcon type={device.deviceType} size={28} />
        </span>
        <span class="sorry-track">
          <i class="ok" />
          <i class="x">
            <CloseIcon size={16} strokeWidth={2.6} />
          </i>
          <i class="dash" />
        </span>
        <span class="sorry-node">
          <LaptopIcon size={28} />
        </span>
      </div>
      <div class="stack-10">
        <h1 class="screen-title screen-title--left">{title}</h1>
        <p class="screen-copy screen-copy--left">{copy}</p>
        {cause && s.reason === 'timeout' && <span class="badge badge--warn">{cause}</span>}
      </div>
      {s.reason !== 'expired' && (
      <section class="card card--pad steps">
        <div class="eyebrow-caps eyebrow-caps--link">This always works</div>
        <div class="step">
          <span class="step-n">1</span>
          <span>
            Put both devices on the same Wi‑Fi, <strong>or</strong> turn on one phone&rsquo;s hotspot and join it from the other.
          </span>
        </div>
        <div class="step">
          <span class="step-n">2</span>
          <span>Reopen fastbeam on both. They&rsquo;ll find each other on their own — no code needed.</span>
        </div>
      </section>
      )}
      <div class="screen-cta stack-10">
        {s.reason !== 'expired' && (
        <Button
          variant="primary"
          class="btn--lg"
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
            class="btn--lg"
            onClick={() => {
              dismissSorry()
              openPairSheet('scan')
            }}
          >
            Enter the new code
          </Button>
        )}
        <Button
          variant="link"
          class="btn--center"
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
