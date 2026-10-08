import { useEffect, useRef, useState } from 'preact/hooks'
import { OFFER_TIMEOUT_MS } from '../../config'
import { getPeer } from '../../state/peers'
import { incomingOffer } from '../../transfer/manager'
import { formatBytes } from '../../transfer/protocol'
import { alertWarn, cx, rowSub } from '../classes'
import { AutoAcceptRow } from './AutoAcceptRow'
import { Button } from './Button'
import { DeviceAvatar } from './DeviceGlyph'
import { DeviceIcon, LockIcon, ShieldIcon } from './Icons'

const fileRow = 'flex min-h-10 items-center justify-between gap-3 border-b border-line text-15 last:border-b-0'
const verifyText = 'flex-1 text-14 leading-[1.4] text-body'

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
      class={cx(
        'incoming w-[calc(100%-24px)] max-w-[460px] overflow-hidden rounded-sheet bg-surface text-ink',
        'mx-3 mt-auto mb-3 desk:mx-auto desk:mb-auto backdrop:bg-[rgba(10,20,21,0.55)]',
      )}
      aria-label={`Incoming ${s.text !== null ? 'text' : 'files'} from ${s.peerName}`}
      onCancel={(e) => {
        e.preventDefault()
        t.decline('declined')
      }}
      onClose={() => t.decline('declined')}
    >
      <div class="h-1 bg-chip" aria-hidden="true">
        <div class="h-1 bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <div class="flex flex-col gap-5 px-5 pt-6 pb-5">
        <div class="flex items-center gap-3.5">
          {peer ? (
            <DeviceAvatar peer={peer} size={56} />
          ) : (
            <span class="inline-flex size-14 flex-none items-center justify-center rounded-full bg-tint text-link">
              <DeviceIcon type="desktop" size={28} />
            </span>
          )}
          <div>
            <h2 class="mb-0.5 font-display text-22 leading-[1.15] font-bold tracking-title">
              {s.peerName} wants to send you {what}
            </h2>
            {subtitle && <div class={rowSub}>{subtitle}</div>}
          </div>
        </div>

        {s.text !== null ? (
          <div class="max-h-40 overflow-y-auto rounded-2xl bg-ground px-3.5 py-3 text-15 leading-[1.45] whitespace-pre-wrap wrap-anywhere">
            {s.text.length > 400 ? `${s.text.slice(0, 400)}…` : s.text}
          </div>
        ) : (
          <ul class="flex list-none flex-col rounded-2xl bg-ground px-3.5 py-1.5">
            {s.files.slice(0, 6).map((f) => (
              <li key={f.fileId} class={fileRow}>
                <span class="min-w-0 truncate font-semibold">{f.name}</span>
                <span class="text-muted">{formatBytes(f.size)}</span>
              </li>
            ))}
            {s.files.length > 6 && <li class={cx(fileRow, 'text-muted')}>and {s.files.length - 6} more</li>}
          </ul>
        )}

        <div class="flex items-center gap-3">
          <span class="inline-flex flex-none text-link">{peer?.passwordVerified ? <LockIcon /> : <ShieldIcon />}</span>
          {peer?.passwordVerified ? (
            <span class={verifyText}>Password verified. This is the device you paired with.</span>
          ) : (
            <>
              <span class={verifyText}>Same code on {s.peerName}? Then it&rsquo;s really them.</span>
              <span class="verify-code font-mono text-20 font-bold tracking-[0.08em] whitespace-nowrap text-link">
                {peer?.verificationCode ?? '--- ---'}
              </span>
            </>
          )}
        </div>

        <AutoAcceptRow peerId={s.peerId} compact />

        {t.blobWarning && (
          <div class={alertWarn} role="note">
            This browser keeps the whole file in memory before saving. Over 1 GB may fail here; a laptop or Chrome on
            Android streams it to disk instead.
          </div>
        )}

        <div class="grid grid-cols-[1fr_1.6fr] gap-2.5">
          <Button variant="secondary" size="lg" autofocus onClick={() => t.decline('declined')}>
            Decline
          </Button>
          <Button variant="primary" size="lg" onClick={() => void t.accept()}>
            Accept{s.text === null ? ` · ${formatBytes(s.totalSize)}` : ''}
          </Button>
        </div>
        <div class="text-center text-13 text-muted">Declines automatically in {left} s</div>
      </div>
    </dialog>
  )
}
