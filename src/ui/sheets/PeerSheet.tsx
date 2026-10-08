import { useEffect, useState } from 'preact/hooks'
import { PROTOCOL } from '../../config'
import { describeConnection, type ConnectionInfo } from '../../net/connection'
import { getPeer, primaryLink } from '../../state/peers'
import { toast } from '../../state/toast'
import { closeSheet, openSendSheet } from '../../state/ui'
import { badgeDot, badgeTone, card, cardList, mono, row, rowSub, rowText, rowTitle, sheetHead, sheetHeadText, sheetTitle } from '../classes'
import { AutoAcceptRow } from '../components/AutoAcceptRow'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { DeviceAvatar } from '../components/DeviceGlyph'
import { CloseIcon, LockIcon, ShieldIcon } from '../components/Icons'
import { Sheet } from '../components/Sheet'

/** `.chips .badge`: the smaller badge used in the sheet header. */
const chipBadge = 'inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-12 font-semibold whitespace-nowrap'

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
      <div class={sheetHead}>
        <DeviceAvatar peer={peer} size={48} />
        <div class={sheetHeadText}>
          <h2 class={sheetTitle}>{peer.name}</h2>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <span class={`${chipBadge} ${badgeTone[live ? 'ok' : 'warn']}`}>
              <span class={badgeDot[live ? 'ok' : 'warn']} />
              {live ? 'Online' : 'Reconnecting…'}
            </span>
            <span class={`${chipBadge} ${badgeTone.neutral}`}>{peer.paired ? 'Paired' : 'Nearby'}</span>
            {peer.passwordVerified && (
              <span class={`${chipBadge} ${badgeTone.ok}`}>
                <LockIcon size={12} strokeWidth={2.4} /> Password verified
              </span>
            )}
            {outdated && <span class={`${chipBadge} ${badgeTone.warn}`}>Update needed</span>}
          </div>
        </div>
        <IconButton label="Close" round onClick={closeSheet}>
          <CloseIcon />
        </IconButton>
      </div>

      <section class={cardList}>
        <div class={row}>
          <div class={rowText}>
            <span class={rowSub}>Device</span>
            <span class={rowTitle}>
              {TYPE_LABEL[peer.deviceType]} · {peer.platform}
            </span>
          </div>
        </div>
        <div class={row}>
          <div class={rowText}>
            <span class={rowSub}>Browser</span>
            <span class={rowTitle}>{peer.browser}</span>
          </div>
        </div>
        <div class={row}>
          <div class={rowText}>
            <span class={rowSub}>Connection</span>
            <span class={rowTitle}>{pathLabel(conn)}</span>
            <span class={rowSub}>
              {conn?.remoteAddress ? `${conn.remoteAddress}${conn.protocol ? ` · ${conn.protocol.toUpperCase()}` : ''}` : 'Encrypted with DTLS'}
              {conn?.rttMs !== null && conn?.rttMs !== undefined ? ` · ${conn.rttMs} ms` : ''}
              {lastSeen > 0 ? ` · heard ${lastSeen} s ago` : ' · heard just now'}
            </span>
          </div>
        </div>
        <div class={row}>
          <div class={rowText}>
            <span class={rowSub}>Found through</span>
            <span class={rowTitle}>{peer.paired ? 'A code, link or QR' : 'The same Wi‑Fi'}</span>
            <span class={rowSub}>
              {peer.links.length} {peer.links.length === 1 ? 'link' : 'links'} · protocol v{peer.protocol}
            </span>
          </div>
        </div>
      </section>

      <section class={cardList}>
        <AutoAcceptRow peerId={peerId} />
      </section>

      <section class={`${card} flex flex-col gap-3 p-4`}>
        <div class="flex items-center gap-3">
          <span class="inline-flex flex-none text-link">{peer.passwordVerified ? <LockIcon /> : <ShieldIcon />}</span>
          <span class="flex-1 text-14 leading-[1.4] text-body">
            {peer.passwordVerified
              ? 'The password check already proved this is the device you paired with.'
              : `Same code on ${peer.name}? Then it’s really them and nothing sits in between.`}
          </span>
        </div>
        <button
          type="button"
          class={`${mono} min-h-12 self-center rounded-xl px-3.5 py-1.5 text-36 tracking-[0.12em] text-link hover:bg-tint`}
          onClick={() => void copyCode()}
          title="Copy code"
        >
          {peer.verificationCode}
        </button>
      </section>

      <Button
        variant="primary"
        size="lg"
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
