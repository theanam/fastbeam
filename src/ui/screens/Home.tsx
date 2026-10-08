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
      <div class="flex min-h-0 flex-1 flex-col">
        {/* Sections settle in once, top to bottom, so the eye lands on "you" first. */}
        <main
          class={
            'flex flex-1 flex-col gap-4 px-4 pt-1 pb-6 desk:gap-[22px] desk:px-10 desk:pt-9 desk:pb-10 wide:px-12 wide:pt-10 wide:pb-12 ' +
            'motion-safe:*:animate-rise motion-safe:[&>:nth-child(2)]:[animation-delay:50ms] ' +
            'motion-safe:[&>:nth-child(3)]:[animation-delay:100ms] motion-safe:[&>:nth-child(4)]:[animation-delay:150ms]'
          }
        >
          {desktop && (
            <header class="flex flex-col gap-1.5">
              <h1 class="m-0 font-display text-30 leading-[1.1] font-bold tracking-display text-balance text-ink desk:text-34">Send files to a nearby device</h1>
              <p class="text-15 text-muted">Devices on this Wi‑Fi with fastbeam open show up below.</p>
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
