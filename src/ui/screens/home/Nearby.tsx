import { useState } from 'preact/hooks'
import { SHARED_NETWORK_PEERS } from '../../../config'
import { type Peer } from '../../../state/peers'
import { addPendingFiles, openPeerSheet, openSendSheet } from '../../../state/ui'
import { alertWarn, cx, dotLive, kbd, live, rowSub } from '../../classes'
import { Button } from '../../components/Button'
import { Tile } from '../../components/Tile'

/** Screen 2. */
export function Nearby({ peers, desktop }: { peers: Peer[]; desktop: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const crowded = peers.length > SHARED_NETWORK_PEERS
  const shown = crowded && !showAll ? peers.slice(0, 6) : peers
  const select = (p: Peer) => openSendSheet(p.deviceId)
  const drop = (p: Peer, files: File[]) => {
    addPendingFiles(files)
    openSendSheet(p.deviceId)
  }
  return (
    <section class="flex flex-col gap-3.5" aria-label="Nearby devices">
      <div class="flex items-end justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h2 class="m-0 font-display text-20 font-bold tracking-title text-ink desk:text-22">Nearby devices</h2>
          <div class={cx(live, 'text-14 text-muted')}>
            <span class={dotLive} aria-hidden="true" />
            {desktop ? 'Drop files on a device, or click one' : 'Tap a device to send'}
          </div>
        </div>
        <div class="inline-flex h-7 flex-none items-center rounded-full bg-chip px-3 text-13 font-bold text-muted tabular-nums">{peers.length} found</div>
      </div>
      {crowded && (
        <div class={alertWarn} role="note">
          You may be on a shared network. Only accept from devices you recognise.
        </div>
      )}
      <div class="grid grid-cols-2 gap-3 desk:grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] desk:gap-4">
        {shown.map((p) => (
          <Tile key={p.deviceId} peer={p} onSelect={select} onInfo={(x) => openPeerSheet(x.deviceId)} onDrop={drop} />
        ))}
      </div>
      {crowded && !showAll && (
        <Button variant="link" onClick={() => setShowAll(true)}>
          Show all {peers.length}
        </Button>
      )}
      {desktop && (
        <div class={cx(rowSub, 'flex flex-wrap items-center gap-1')}>
          Tip: press <kbd class={kbd}>{navigator.platform.includes('Mac') ? '⌘ V' : 'Ctrl V'}</kbd> anywhere to send
          what&rsquo;s on your clipboard.
        </div>
      )}
    </section>
  )
}
