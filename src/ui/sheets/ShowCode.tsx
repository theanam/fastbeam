import { useEffect, useState } from 'preact/hooks'
import { PASSWORD_MIN } from '../../config'
import { host, newHostPassword, pairLink, setHostLocked, setHostPassword } from '../../net/pairing'
import { card, cx, dotLive, inputRowWarn, mono, monoInput, rowSub, rowText, rowTitle } from '../classes'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Switch } from '../components/Switch'
import { CopyIcon, LockIcon, ShareIcon } from '../components/Icons'
import { QrCode } from '../components/QrCode'
import { copyCode, copyLink, shareLink, useHosting } from './pairActions'

function useCountdown(expiresAt: number | null | undefined): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (expiresAt === null) return 'paused'
  if (!expiresAt) return '--:--'
  const s = Math.max(0, Math.round((expiresAt - now) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Screen 7. */
export function ShowCode() {
  useHosting()
  const h = host.value
  const countdown = useCountdown(h?.expiresAt)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  if (!h) return <div class="text-muted">Getting a code…</div>
  const tooShort = h.locked && h.password.length < PASSWORD_MIN
  return (
    <>
      <section class="flex flex-col items-center gap-3.5 rounded-[24px] border border-line bg-surface p-5">
        <QrCode value={pairLink(h.code)} />
        <div class="flex items-center justify-center gap-1">
          <button
            type="button"
            class={`bigcode ${mono} rounded-xl px-2.5 py-0.5 text-left text-44 leading-none tracking-[0.14em] transition-[background-color] duration-120 ease-[ease] hover:bg-tint`}
            aria-label={`Code ${h.code.split('').join(' ')}`}
            title="Tap to copy the code"
            onClick={() => void copyCode(h.code)}
          >
            {h.code.slice(0, 3)}
            <span class="text-[color-mix(in_srgb,var(--color-muted)_60%,var(--color-line))]">·</span>
            {h.code.slice(3)}
          </button>
          <IconButton label="Copy code" tone="muted" onClick={() => void copyCode(h.code)}>
            <CopyIcon size={20} />
          </IconButton>
        </div>
        <div class={rowSub}>fastbeam.app/#{h.code}</div>
        <div class="grid w-full grid-cols-2 gap-2.5">
          <Button variant="secondary" size="md" onClick={() => void copyLink(h.code)}>
            <CopyIcon /> Copy link
          </Button>
          {canShare ? (
            <Button variant="primary" size="md" onClick={() => void shareLink(h.code)}>
              <ShareIcon /> Share
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={() => void copyLink(h.code)}>
              <ShareIcon /> Copy
            </Button>
          )}
        </div>
      </section>

      <section class={`${card} flex flex-col gap-3 p-4`}>
        <div class="flex min-h-11 items-center gap-3">
          <span class="inline-flex text-link">
            <LockIcon />
          </span>
          <span class={rowText}>
            <span class={rowTitle}>Protect with a password</span>
            <span class={rowSub}>Tell it to them separately</span>
          </span>
          <Switch checked={h.locked} onChange={setHostLocked} label="Protect with a password" />
        </div>
        {h.locked && (
          <div
            class={cx(
              'flex h-12 items-center gap-1 rounded-btn border-[1.5px] border-accent bg-surface pr-1 pl-3.5 transition-shadow duration-120',
              'focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-tint)]',
              tooShort && inputRowWarn,
            )}
          >
            <label class="sr-only" for="host-pw">
              Password
            </label>
            <input
              id="host-pw"
              class={monoInput}
              type="text"
              value={h.password}
              autocomplete="off"
              autocapitalize="off"
              spellcheck={false}
              aria-describedby="host-pw-help"
              onInput={(e) => setHostPassword((e.currentTarget as HTMLInputElement).value)}
            />
            <Button variant="link" size="md" onClick={newHostPassword}>
              New
            </Button>
          </div>
        )}
        {h.locked && (
          <div id="host-pw-help" class={rowSub}>
            {tooShort ? `At least ${PASSWORD_MIN} characters.` : h.deriving ? 'Preparing…' : 'Never stored, never in the link or QR.'}
          </div>
        )}
      </section>

      <div class="mt-auto flex items-center justify-center gap-2 pt-1 text-14 text-muted">
        <span class={dotLive} aria-hidden="true" />
        {h.expiresAt === null ? 'Someone is connecting… the code stays until they finish' : `Waiting for the other device · expires in ${countdown}`}
      </div>
    </>
  )
}
