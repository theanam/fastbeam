import { useState } from 'preact/hooks'
import { closeSheet, type PairTab } from '../../state/ui'
import { IconButton } from '../components/IconButton'
import { BackIcon } from '../components/Icons'
import { Tabs } from '../components/Tabs'
import { Sheet } from '../components/Sheet'
import { ScanEnter } from './ScanEnter'
import { ShowCode } from './ShowCode'

const TABS = [
  { value: 'show', label: 'Show my code' },
  { value: 'scan', label: 'Scan or enter' },
] as const

export function PairSheet({ tab: initialTab, prefill }: { tab: PairTab; prefill?: string }) {
  const [tab, setTab] = useState<PairTab>(initialTab)
  return (
    <Sheet label="Connect a device" onClose={closeSheet}>
      <div class="sheet-head sheet-head--plain">
        <IconButton label="Back" onClick={closeSheet}>
          <BackIcon />
        </IconButton>
        <h2 class="sheet-title">Connect a device</h2>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Pairing method" tone="chip" />
      <div class="sheet-scroll">{tab === 'show' ? <ShowCode /> : <ScanEnter {...(prefill ? { prefill } : {})} />}</div>
    </Sheet>
  )
}
