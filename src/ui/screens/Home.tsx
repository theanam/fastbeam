import { visiblePeers } from '../../state/peers'
import { dragging } from '../../state/ui'
import { AppFrame } from '../components/AppFrame'
import { useIsDesktop } from '../useIsDesktop'
import { Header } from '../components/Header'
import { PairPanel } from '../components/PairPanel'
import { Identity } from './home/Identity'
import { Looking } from './home/Looking'
import { Nearby } from './home/Nearby'
import { PairEntry } from './home/PairEntry'
import { PendingBanner } from './home/PendingBanner'
import { PrivacyNote } from './home/PrivacyNote'

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
