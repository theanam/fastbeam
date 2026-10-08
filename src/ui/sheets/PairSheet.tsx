import { useState } from 'preact/hooks'
import { closeSheet, type PairTab } from '../../state/ui'
import { sheetTitle } from '../classes'
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
      <div class="-ml-3 flex flex-none items-center gap-1">
        <IconButton label="Back" onClick={closeSheet}>
          <BackIcon />
        </IconButton>
        <h2 class={sheetTitle}>Connect a device</h2>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Pairing method" tone="chip" />
      <div class="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1">
        {tab === 'show' ? <ShowCode /> : <ScanEnter {...(prefill ? { prefill } : {})} />}
      </div>
    </Sheet>
  )
}
