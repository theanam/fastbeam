import { useEffect, useRef, useState } from 'preact/hooks'
import { OFFER_TIMEOUT_MS } from '../../config'
import { getPeer } from '../../state/peers'
import { incomingOffer } from '../../transfer/manager'
import { formatBytes } from '../../transfer/protocol'
import { AutoAcceptRow } from './AutoAcceptRow'
import { Button } from './Button'
import { DeviceAvatar } from './DeviceGlyph'
import { DeviceIcon, LockIcon, ShieldIcon } from './Icons'

/** Screen 4. Native <dialog> so Esc and focus containment come for free; Accept is never auto-focused. */
export function IncomingDialog() {
  const t = incomingOffer.value
  const ref = useRef<HTMLDialogElement>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const d = ref.current
    if (!t || !d) return
    if (!d.open) d.showModal()
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    try {
      navigator.vibrate?.(80)
    } catch {
      /* no vibration */
    }
    const prevTitle = document.title
    if (document.visibilityState === 'hidden') document.title = '(1) Incoming — fastbeam'
    const onVis = () => {
      if (document.visibilityState === 'visible') document.title = prevTitle
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onVis)
      document.title = prevTitle
      if (d.open) d.close()
    }
  }, [t])

  if (!t) return null
  const s = t.snap.value
  if (s.state !== 'offered') return null
  const peer = getPeer(s.peerId)
  const left = Math.max(0, Math.ceil((s.offeredAt + OFFER_TIMEOUT_MS - now) / 1000))
  const pct = Math.max(0, Math.min(100, (left / (OFFER_TIMEOUT_MS / 1000)) * 100))
  const count = s.files.length
  const what = s.text !== null ? 'some text' : count === 1 ? 'a file' : `${count} files`
  const subtitle = peer ? `${peer.platform} · ${peer.browser} · ${peer.paired ? 'Paired' : 'Nearby'}` : ''

  return (
    <dialog
      ref={ref}
      class="incoming"
      aria-label={`Incoming ${s.text !== null ? 'text' : 'files'} from ${s.peerName}`}
      onCancel={(e) => {
        e.preventDefault()
        t.decline('declined')
      }}
      onClose={() => t.decline('declined')}
    >
      <div class="incoming-bar" aria-hidden="true">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div class="incoming-body">
        <div class="incoming-head">
          {peer ? (
            <DeviceAvatar peer={peer} size={56} />
          ) : (
            <span class="avatar avatar--lg">
              <DeviceIcon type="desktop" size={28} />
            </span>
          )}
          <div>
            <h2 class="incoming-title">
              {s.peerName} wants to send you {what}
            </h2>
            {subtitle && <div class="row-sub">{subtitle}</div>}
          </div>
        </div>

        {s.text !== null ? (
          <div class="incoming-text">{s.text.length > 400 ? `${s.text.slice(0, 400)}…` : s.text}</div>
        ) : (
          <ul class="incoming-files">
            {s.files.slice(0, 6).map((f) => (
              <li key={f.fileId}>
                <span class="incoming-file-name">{f.name}</span>
                <span class="muted">{formatBytes(f.size)}</span>
              </li>
            ))}
            {s.files.length > 6 && <li class="muted">and {s.files.length - 6} more</li>}
          </ul>
        )}

        <div class="verify">
          <span class="verify-icon">{peer?.passwordVerified ? <LockIcon /> : <ShieldIcon />}</span>
          {peer?.passwordVerified ? (
            <span class="verify-text">Password verified. This is the device you paired with.</span>
          ) : (
            <>
              <span class="verify-text">Same code on {s.peerName}? Then it&rsquo;s really them.</span>
              <span class="verify-code mono">{peer?.verificationCode ?? '--- ---'}</span>
            </>
          )}
        </div>

        <AutoAcceptRow peerId={s.peerId} compact />

        {t.blobWarning && (
          <div class="alert alert--warn" role="note">
            This browser keeps the whole file in memory before saving. Over 1 GB may fail here; a laptop or Chrome on
            Android streams it to disk instead.
          </div>
        )}

        <div class="incoming-actions">
          <Button variant="secondary" autofocus onClick={() => t.decline('declined')}>
            Decline
          </Button>
          <Button variant="primary" onClick={() => void t.accept()}>
            Accept{s.text === null ? ` · ${formatBytes(s.totalSize)}` : ''}
          </Button>
        </div>
        <div class="incoming-countdown muted">Declines automatically in {left} s</div>
      </div>
    </dialog>
  )
}
