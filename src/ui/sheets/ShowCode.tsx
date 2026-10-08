import { useEffect, useState } from 'preact/hooks'
import { PASSWORD_MIN } from '../../config'
import { host, newHostPassword, pairLink, setHostLocked, setHostPassword } from '../../net/pairing'
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
  if (!h) return <div class="muted">Getting a code…</div>
  const tooShort = h.locked && h.password.length < PASSWORD_MIN
  return (
    <>
      <section class="card showcode">
        <QrCode value={pairLink(h.code)} />
        <div class="code-row">
          <button
            type="button"
            class="bigcode bigcode--btn mono"
            aria-label={`Code ${h.code.split('').join(' ')}`}
            title="Tap to copy the code"
            onClick={() => void copyCode(h.code)}
          >
            {h.code.slice(0, 3)}
            <span class="bigcode-dot">·</span>
            {h.code.slice(3)}
          </button>
          <IconButton label="Copy code" class="code-copy" onClick={() => void copyCode(h.code)}>
            <CopyIcon size={20} />
          </IconButton>
        </div>
        <div class="row-sub">fastbeam.app/#{h.code}</div>
        <div class="two-up">
          <Button variant="secondary" class="btn--md" onClick={() => void copyLink(h.code)}>
            <CopyIcon /> Copy link
          </Button>
          {canShare ? (
            <Button variant="primary" class="btn--md" onClick={() => void shareLink(h.code)}>
              <ShareIcon /> Share
            </Button>
          ) : (
            <Button variant="primary" class="btn--md" onClick={() => void copyLink(h.code)}>
              <ShareIcon /> Copy
            </Button>
          )}
        </div>
      </section>

      <section class="card card--pad lockcard">
        <div class="row" style={{ minHeight: 44, borderBottom: 0 }}>
          <span class="lockcard-icon">
            <LockIcon />
          </span>
          <span class="row-text">
            <span class="row-title">Protect with a password</span>
            <span class="row-sub">Tell it to them separately</span>
          </span>
          <Switch checked={h.locked} onChange={setHostLocked} label="Protect with a password" />
        </div>
        {h.locked && (
          <div class={`input-row input-row--accent${tooShort ? ' input-row--warn' : ''}`}>
            <label class="visually-hidden" for="host-pw">
              Password
            </label>
            <input
              id="host-pw"
              class="mono-input"
              type="text"
              value={h.password}
              autocomplete="off"
              autocapitalize="off"
              spellcheck={false}
              aria-describedby="host-pw-help"
              onInput={(e) => setHostPassword((e.currentTarget as HTMLInputElement).value)}
            />
            <Button variant="link" onClick={newHostPassword}>
              New
            </Button>
          </div>
        )}
        {h.locked && (
          <div id="host-pw-help" class="row-sub">
            {tooShort ? `At least ${PASSWORD_MIN} characters.` : h.deriving ? 'Preparing…' : 'Never stored, never in the link or QR.'}
          </div>
        )}
      </section>

      <div class="waiting muted">
        <span class="dot-live" aria-hidden="true" />
        {h.expiresAt === null ? 'Someone is connecting… the code stays until they finish' : `Waiting for the other device · expires in ${countdown}`}
      </div>
    </>
  )
}
