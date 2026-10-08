import { canOfferAutoAccept, isAutoAccept, setAutoAccept } from '../../state/autoAccept'
import { getPeer } from '../../state/peers'
import { chooseSinkKind } from '../../transfer/sinks'
import { cx, rowText, rowTitle } from '../classes'
import { Switch } from './Switch'

/**
 * "Auto-accept from X for this session". Shown only once a transfer from X was accepted by hand.
 * Explains where auto-accepted files go, since no picker can open without a click.
 */
export function AutoAcceptRow({ peerId, compact = false }: { peerId: string; compact?: boolean }) {
  const peer = getPeer(peerId)
  if (!peer || !canOfferAutoAccept(peerId)) return null
  const on = isAutoAccept(peerId)
  const kind = chooseSinkKind({ gestureFree: true })
  const where =
    kind === 'sw' ? 'Files go straight to Downloads' : kind === 'opfs' ? 'Files wait on the Done screen with a Save button' : 'Files download when they finish'
  return (
    <div class={cx('flex items-center gap-3', compact ? 'min-h-13 rounded-btn bg-ground px-3 py-2' : 'min-h-15')}>
      <div class={rowText}>
        <span class={rowTitle}>Auto-accept from {peer.name}</span>
        <span class={cx(compact ? 'text-12' : 'text-13', 'text-muted')}>
          This session only. {where}.{peer.passwordVerified ? '' : ' Keep an eye on the verification code if the network is shared.'}
        </span>
      </div>
      <Switch checked={on} onChange={(v) => setAutoAccept(peerId, v)} label={`Auto-accept from ${peer.name} for this session`} />
    </div>
  )
}
