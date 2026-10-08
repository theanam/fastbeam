import { useEffect, useState } from 'preact/hooks'
import { PROTOCOL } from '../../config'
import { describeConnection, type ConnectionInfo } from '../../net/connection'
import { getPeer, primaryLink } from '../../state/peers'
import { toast } from '../../state/toast'
import { closeSheet, openSendSheet } from '../../state/ui'
import { AutoAcceptRow } from '../components/AutoAcceptRow'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { DeviceAvatar } from '../components/DeviceGlyph'
import { CloseIcon, LockIcon, ShieldIcon } from '../components/Icons'
import { Sheet } from '../components/Sheet'

const TYPE_LABEL = { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' } as const

function pathLabel(c: ConnectionInfo | null): string {
  if (!c || c.path === 'unknown') return 'Direct · checking the route…'
  return c.path === 'local' ? 'Direct · same network' : 'Direct · across the internet'
}

/** Device details for one peer: what it is, how it is connected, and the code to compare out loud. */
export function PeerSheet({ peerId }: { peerId: string }) {
  const peer = getPeer(peerId)
  const [conn, setConn] = useState<ConnectionInfo | null>(null)

  useEffect(() => {
    if (!peer) {
      closeSheet()
      return
    }
    let alive = true
    const tick = async () => {
      const link = primaryLink(peer)
      if (!link) return
      const c = await describeConnection(link.pc)
      if (alive) setConn(c)
    }
    void tick()
    const t = window.setInterval(() => void tick(), 3000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [peerId, peer?.links.length])

  if (!peer) return null
  const outdated = peer.protocol !== PROTOCOL
  const live = peer.online && peer.links.some((l) => l.open)
  const lastSeen = Math.max(0, Math.round((Date.now() - peer.lastSeen) / 1000))

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(peer.verificationCode.replace(' ', ''))
      toast('Code copied')
    } catch {
      /* ignore */
    }
  }

  return (
    <Sheet label={`About ${peer.name}`} onClose={closeSheet} tall={false}>
      <div class="sheet-head">
        <DeviceAvatar peer={peer} size={48} />
        <div class="sheet-head-text">
          <h2 class="sheet-title">{peer.name}</h2>
          <div class="chips">
            <span class={`badge ${live ? 'badge--ok' : 'badge--warn'}`}>
              <span class="badge-dot" />
              {live ? 'Online' : 'Reconnecting…'}
            </span>
            <span class="badge">{peer.paired ? 'Paired' : 'Nearby'}</span>
            {peer.passwordVerified && (
              <span class="badge badge--ok">
                <LockIcon size={12} strokeWidth={2.4} /> Password verified
              </span>
            )}
            {outdated && <span class="badge badge--warn">Update needed</span>}
          </div>
        </div>
        <IconButton label="Close" class="iconbtn--round" onClick={closeSheet}>
          <CloseIcon />
        </IconButton>
      </div>

      <section class="card card--list">
        <div class="row">
          <div class="row-text">
            <span class="row-sub">Device</span>
            <span class="row-title">
              {TYPE_LABEL[peer.deviceType]} · {peer.platform}
            </span>
          </div>
        </div>
        <div class="row">
          <div class="row-text">
            <span class="row-sub">Browser</span>
            <span class="row-title">{peer.browser}</span>
          </div>
        </div>
        <div class="row">
          <div class="row-text">
            <span class="row-sub">Connection</span>
            <span class="row-title">{pathLabel(conn)}</span>
            <span class="row-sub">
              {conn?.remoteAddress ? `${conn.remoteAddress}${conn.protocol ? ` · ${conn.protocol.toUpperCase()}` : ''}` : 'Encrypted with DTLS'}
              {conn?.rttMs !== null && conn?.rttMs !== undefined ? ` · ${conn.rttMs} ms` : ''}
              {lastSeen > 0 ? ` · heard ${lastSeen} s ago` : ' · heard just now'}
            </span>
          </div>
        </div>
        <div class="row">
          <div class="row-text">
            <span class="row-sub">Found through</span>
            <span class="row-title">{peer.paired ? 'A code, link or QR' : 'The same Wi‑Fi'}</span>
            <span class="row-sub">
              {peer.links.length} {peer.links.length === 1 ? 'link' : 'links'} · protocol v{peer.protocol}
            </span>
          </div>
        </div>
      </section>

      <section class="card card--list">
        <AutoAcceptRow peerId={peerId} />
      </section>

      <section class="card card--pad verify-card">
        <div class="verify">
          <span class="verify-icon">{peer.passwordVerified ? <LockIcon /> : <ShieldIcon />}</span>
          <span class="verify-text">
            {peer.passwordVerified
              ? 'The password check already proved this is the device you paired with.'
              : `Same code on ${peer.name}? Then it’s really them and nothing sits in between.`}
          </span>
        </div>
        <button type="button" class="verify-big mono" onClick={() => void copyCode()} title="Copy code">
          {peer.verificationCode}
        </button>
      </section>

      <Button
        variant="primary"
        class="btn--lg"
        disabled={outdated || !live}
        onClick={() => {
          openSendSheet(peer.deviceId)
        }}
      >
        Send to {peer.name}
      </Button>
    </Sheet>
  )
}
