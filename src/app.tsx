import { sheet } from './state/ui'
import { Console } from './ui/components/Console'
import { IncomingDialog } from './ui/components/IncomingDialog'
import { MediaViewer } from './ui/components/MediaViewer'
import { TextReceivedDialog } from './ui/components/TextReceivedDialog'
import { Toasts } from './ui/components/Toasts'
import { PairSheet } from './ui/sheets/PairSheet'
import { PeerSheet } from './ui/sheets/PeerSheet'
import { SendSheet } from './ui/sheets/SendSheet'
import { Screen } from './ui/screens/Screen'
import { useTransferToasts } from './ui/useTransferToasts'

export function App() {
  useTransferToasts()
  const s = sheet.value
  return (
    <>
      <Screen />
      {s?.kind === 'send' && <SendSheet key={s.peerId} peerId={s.peerId} tab={s.tab} />}
      {s?.kind === 'pair' && <PairSheet tab={s.tab} {...(s.prefill ? { prefill: s.prefill } : {})} />}
      {s?.kind === 'peer' && <PeerSheet key={s.peerId} peerId={s.peerId} />}
      <IncomingDialog />
      <TextReceivedDialog />
      <MediaViewer />
      <Console />
      <Toasts />
    </>
  )
}
