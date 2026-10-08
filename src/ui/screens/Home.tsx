import { useEffect, useState } from 'preact/hooks'
import { SHARED_NETWORK_PEERS, STILL_LOOKING_MS } from '../../config'
import { device } from '../../state/identity'
import { visiblePeers, type Peer } from '../../state/peers'
import {
  addPendingFiles,
  clearPending,
  dragging,
  openPairSheet,
  openPeerSheet,
  openSendSheet,
  pendingFiles,
  pendingText,
} from '../../state/ui'
import { AppFrame, useIsDesktop } from '../components/AppFrame'
import { Button, IconButton } from '../components/Controls'
import { EditableName } from '../components/EditableName'
import { Header } from '../components/Header'
import { CheckIcon, CloseIcon, CodeIcon, DeviceIcon, ScanIcon, ShieldPlainIcon, WifiIcon } from '../components/Icons'
import { PairPanel } from '../components/PairPanel'
import { Tile } from '../components/Tile'

/** Who this device is, always at the top so people know what the other side will see. */
function Identity() {
  return (
    <section class="me-card" aria-label="This device">
      <span class="me-icon" aria-hidden="true">
        <DeviceIcon type={device.deviceType} size={28} />
      </span>
      <div class="me-text">
        <div class="eyebrow">You're visible as</div>
        <EditableName />
        <div class="me-sub">
          {device.platform} &middot; {device.browser}
        </div>
      </div>
    </section>
  )
}

/** Screen 1. */
function Looking() {
  const [stillLooking, setStillLooking] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setStillLooking(true), STILL_LOOKING_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <section class="looking" aria-label="Looking for devices">
      <div class="pulse" aria-hidden="true">
        <div class="pulse-ring" />
        <div class="pulse-ring" />
        <div class="pulse-ring" />
        <div class="pulse-core" />
        <div class="pulse-self">
          <WifiIcon size={30} />
        </div>
      </div>
      <div class="looking-text">
        <h2 class="looking-title">{stillLooking ? 'Still looking' : 'Looking for devices'}</h2>
        <p class="home-hint" aria-live="polite">
          {stillLooking ? (
            <>Different Wi‑Fi? Use a code instead.</>
          ) : (
            <>
              Open <strong>fastbeam.app</strong> on the other device, on this same Wi‑Fi.
            </>
          )}
        </p>
      </div>
      <ol class="howto" aria-label="How it works">
        <li>
          <span class="howto-icon" aria-hidden="true">
            <WifiIcon size={20} />
          </span>
          <span>Open fastbeam on both devices</span>
        </li>
        <li>
          <span class="howto-icon" aria-hidden="true">
            <DeviceIcon type="phone" size={20} />
          </span>
          <span>Pick the other device when it appears</span>
        </li>
        <li>
          <span class="howto-icon" aria-hidden="true">
            <CheckIcon size={20} />
          </span>
          <span>They accept, and it goes straight across</span>
        </li>
      </ol>
    </section>
  )
}

function PendingBanner() {
  const files = pendingFiles.value
  const text = pendingText.value
  if (!files.length && !text) return null
  const what = files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'}` : 'Text'
  return (
    <div class="pending" role="status">
      <span>
        <strong>{what} ready.</strong> Tap a device to send {files.length ? 'them' : 'it'}.
      </span>
      <IconButton label="Clear" onClick={clearPending}>
        <CloseIcon size={18} />
      </IconButton>
    </div>
  )
}

/** Screen 2. */
function Nearby({ peers, desktop }: { peers: Peer[]; desktop: boolean }) {
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

/** Mobile bottom bar: both pairing entry points whenever "Not on the same Wi‑Fi?" is visible. */
function PairEntry() {
  return (
    <aside class="pair-entry" aria-label="Pair with a code">
      <div class="pair-entry-title">Not on the same Wi‑Fi?</div>
      <div class="pair-entry-actions">
        <Button variant="secondary" onClick={() => openPairSheet('show')}>
          <CodeIcon />
          Show my code
        </Button>
        <Button variant="primary" onClick={() => openPairSheet('scan')}>
          <ScanIcon />
          Scan or enter
        </Button>
      </div>
    </aside>
  )
}

/** Desktop side panel footer: the one promise people need before sending anything. */
function PrivacyNote() {
  return (
    <section class="privacy">
      <span class="privacy-icon" aria-hidden="true">
        <ShieldPlainIcon size={20} />
      </span>
      <div>
        <div class="privacy-title">Nothing is uploaded</div>
        <p class="privacy-copy">Files and text go straight between the two browsers, encrypted. No accounts.</p>
      </div>
    </section>
  )
}

export function Home() {
  const peers = visiblePeers.value
  const desktop = useIsDesktop()
  return (
    <AppFrame
      desktop={desktop}
      dragging={dragging.value}
      aside={
        desktop ? (
          <>
            <PairPanel />
            <PrivacyNote />
          </>
        ) : undefined
      }
    >
      {!desktop && <Header />}
      <div class="home">
        <main class="home-main">
          {desktop && (
            <header class="page-head">
              <h1 class="page-title">Send files to a nearby device</h1>
              <p class="page-sub">Devices on this Wi‑Fi with fastbeam open show up below.</p>
            </header>
          )}
          <Identity />
          <PendingBanner />
          {peers.length === 0 ? <Looking /> : <Nearby peers={peers} desktop={desktop} />}
        </main>
        {!desktop && <PairEntry />}
      </div>
    </AppFrame>
  )
}
