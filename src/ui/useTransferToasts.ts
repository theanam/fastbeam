import { useEffect } from 'preact/hooks'
import { toast } from '../state/toast'
import { textReceived } from '../state/ui'
import { clearIncoming, clearOutgoing, incoming, outgoing } from '../transfer/manager'

/** Turn terminal transfer states that have no screen of their own into toasts, then clear them. */
export function useTransferToasts() {
  const o = outgoing.value?.snap.value
  const i = incoming.value?.snap.value
  useEffect(() => {
    if (!o) return
    const name = o.peerName
    const msg =
      o.state === 'declined'
        ? `${name} declined`
        : o.state === 'busy'
          ? `${name} is busy with another transfer`
          : o.state === 'timeout'
            ? `${name} didn’t answer`
            : o.state === 'cancelled'
              ? o.cancelledBy === 'receiver'
                ? `${name} cancelled`
                : 'Cancelled'
              : o.state === 'failed'
                ? `Transfer failed: ${o.error ?? 'connection lost'}`
                : o.state === 'done' && o.text !== null
                  ? `Text sent to ${name}`
                  : null
    if (msg) {
      toast(msg)
      clearOutgoing()
    }
  }, [o?.state])
  useEffect(() => {
    if (!i) return
    if (i.state === 'done' && i.text !== null) {
      textReceived.value = { from: i.peerName, fromId: i.peerId, text: i.text }
      clearIncoming()
      return
    }
    const msg =
      i.state === 'cancelled' && i.cancelledBy === 'sender'
        ? `${i.peerName} cancelled`
        : i.state === 'cancelled'
          ? 'Cancelled'
          : i.state === 'failed'
            ? `Transfer failed: ${i.error ?? 'connection lost'}`
            : i.state === 'declined'
              ? null
              : null
    if (msg) toast(msg)
    if (i.state === 'cancelled' || i.state === 'failed' || i.state === 'declined') clearIncoming()
  }, [i?.state])
}
