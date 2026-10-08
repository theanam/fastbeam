import { useState } from 'preact/hooks'
import { SHARED_NETWORK_PEERS } from '../../../config'
import { type Peer } from '../../../state/peers'
import { addPendingFiles, openPeerSheet, openSendSheet } from '../../../state/ui'
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
    <section class="nearby" aria-label="Nearby devices">
      <div class="grid-head">
        <div class="grid-head-text">
          <h2 class="section-title">Nearby devices</h2>
          <div class="live">
            <span class="dot-live" aria-hidden="true" />
            {desktop ? 'Drop files on a device, or click one' : 'Tap a device to send'}
          </div>
        </div>
        <div class="count-chip">{peers.length} found</div>
      </div>
      {crowded && (
        <div class="alert alert--warn" role="note">
          You may be on a shared network. Only accept from devices you recognise.
        </div>
      )}
      <div class="tiles">
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
        <div class="row-sub tip">
          Tip: press <kbd class="kbd">{navigator.platform.includes('Mac') ? '⌘ V' : 'Ctrl V'}</kbd> anywhere to send
          what&rsquo;s on your clipboard.
        </div>
      )}
    </section>
  )
}
