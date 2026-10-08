import { openPairSheet } from '../../../state/ui'
import { Button } from '../../components/Button'
import { CodeIcon, ScanIcon } from '../../components/Icons'

/** Mobile bottom bar: both pairing entry points whenever "Not on the same Wi‑Fi?" is visible. */
export function PairEntry() {
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
