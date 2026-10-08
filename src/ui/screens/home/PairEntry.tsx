import { openPairSheet } from '../../../state/ui'
import { Button } from '../../components/Button'
import { CodeIcon, ScanIcon } from '../../components/Icons'

/** Mobile bottom bar: both pairing entry points whenever "Not on the same Wi‑Fi?" is visible. */
export function PairEntry() {
  return (
    // Sticky so the code entry stays in reach while the device list scrolls.
    <aside
      class="sticky bottom-0 z-[5] flex flex-col gap-3 rounded-t-3xl border-t border-line bg-surface px-4 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-20px_rgba(15,52,56,0.2)]"
      aria-label="Pair with a code"
    >
      <div class="text-center text-14 font-semibold text-muted">Not on the same Wi‑Fi?</div>
      <div class="grid grid-cols-2 gap-2.5 max-[359px]:grid-cols-1">
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
