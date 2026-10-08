/**
 * One outgoing and one incoming transfer at a time; anything else is answered with decline/busy.
 * Owns the wake lock and the beforeunload guard while a transfer runs.
 */
import { effect, signal } from '@preact/signals'
import type { ControlMessage, PeerLink } from '../net/peerLink'
import { isAutoAccept } from '../state/autoAccept'
import { logger } from '../state/log'
import type { Peer } from '../state/peers'
import { toast } from '../state/toast'
import { formatBytes, isTransferMessage, isValidOffer, type OfferMessage } from './protocol'
import { IncomingTransfer } from './receiver'
import { OutgoingTransfer } from './sender'
import { chooseSinkKind } from './sinks'

const L = logger('transfer')

/** Log every state change of a transfer snapshot signal. */
function watchStates(label: string, t: OutgoingTransfer | IncomingTransfer): void {
  let last = ''
  const dispose = effect(() => {
    const s = t.snap.value
    if (s.state === last) return
    last = s.state
    const extra: Record<string, unknown> = {}
    if (s.state === 'done' && s.startedAt && s.finishedAt) {
      const secs = Math.max(0.001, (s.finishedAt - s.startedAt) / 1000)
      extra.took = `${secs.toFixed(1)} s`
      extra.avg = `${formatBytes(s.totalSize / secs)}/s`
    }
    if ('error' in s && s.error) extra.error = s.error
    if ('cancelledBy' in s && s.cancelledBy) extra.by = s.cancelledBy
    if ('sinkKind' in s && s.state === 'receiving') extra.sink = s.sinkKind
    const level = s.state === 'failed' ? 'error' : s.state === 'declined' || s.state === 'cancelled' || s.state === 'timeout' || s.state === 'busy' ? 'warn' : 'info'
    L[level](`${label} ${t.id.slice(0, 8)} → ${s.state}`, Object.keys(extra).length ? extra : undefined)
    if (['done', 'declined', 'busy', 'timeout', 'cancelled', 'failed'].includes(s.state)) queueMicrotask(dispose)
  })
}

export const outgoing = signal<OutgoingTransfer | null>(null)
export const incoming = signal<IncomingTransfer | null>(null)

/** Fired for the UI when a new offer arrives (vibration, title prefix, dialog). */
export const incomingOffer = signal<IncomingTransfer | null>(null)

function busy(peer: Peer, link: PeerLink): boolean {
  const cur = incoming.value
  if (!cur) return false
  const st = cur.snap.value.state
  return st === 'offered' || st === 'receiving'
}

export function startSend(peer: Peer, link: PeerLink, input: { files: File[] } | { text: string }): OutgoingTransfer | null {
  const cur = outgoing.value
  if (cur && (cur.snap.value.state === 'offered' || cur.snap.value.state === 'sending')) {
    toast('Finish the current transfer first')
    return null
  }
  const t = new OutgoingTransfer(peer, link, input)
  const s = t.snap.value
  L.info(
    `offering ${s.text !== null ? 'text' : `${s.files.length} file(s), ${formatBytes(s.totalSize)}`} to ${peer.name}`,
    { chunk: link.chunkSize, maxMessage: link.pc.sctp?.maxMessageSize },
  )
  watchStates(`send to ${peer.name}`, t)
  outgoing.value = t
  void t.run()
  return t
}

export function clearOutgoing(): void {
  outgoing.value = null
}

export function clearIncoming(): void {
  const cur = incoming.value
  if (cur) {
    const st = cur.snap.value.state
    if (st === 'offered') cur.decline('declined')
    else if (st === 'receiving') cur.cancel()
  }
  incoming.value = null
  incomingOffer.value = null
}

export function handleControl(peer: Peer, link: PeerLink, msg: ControlMessage): void {
  if (!isTransferMessage(msg)) return
  if (msg.type === 'offer') {
    const offer = msg as OfferMessage
    if (!isValidOffer(offer)) return
    if (busy(peer, link)) {
      L.warn(`offer from ${peer.name} declined: busy`)
      link.sendControl({ type: 'decline', transferId: offer.transferId, reason: 'busy' })
      return
    }
    const t = new IncomingTransfer(peer, link, offer, () => {
      if (incomingOffer.value === t) incomingOffer.value = null
    })
    L.info(
      `offer from ${peer.name}: ${offer.text !== undefined ? 'text' : `${offer.files?.length ?? 0} file(s), ${formatBytes(offer.totalSize)}`}`,
      { sink: t.snap.value.sinkKind },
    )
    watchStates(`receive from ${peer.name}`, t)
    incoming.value = t
    if (isAutoAccept(peer.deviceId)) {
      // Session auto-accept: no dialog, and a sink that needs no click.
      const kind = chooseSinkKind({ gestureFree: true })
      const what = offer.text !== undefined ? 'text' : `${offer.files?.length ?? 0} file(s)`
      L.info(`auto-accepting ${what} from ${peer.name}`, { sink: kind })
      incomingOffer.value = null
      toast(`Auto-accepting ${what} from ${peer.name}`)
      void t.accept(kind)
      return
    }
    incomingOffer.value = t
    return
  }
  const out = outgoing.value
  if (out && out.id === msg.transferId) {
    out.handle(msg)
    return
  }
  const inc = incoming.value
  if (inc && inc.id === msg.transferId) inc.handle(msg)
}

export function handleChunk(_peer: Peer, _link: PeerLink, frame: ArrayBuffer): void {
  incoming.value?.handleChunk(frame)
}

export function onPeerGone(peer: Peer, _link: PeerLink): void {
  const out = outgoing.value
  if (out && out.peer.deviceId === peer.deviceId) out.fail(`${peer.name} disconnected`)
  const inc = incoming.value
  if (inc && inc.peer.deviceId === peer.deviceId) inc.fail(`${peer.name} disconnected`)
}

// ---- Wake lock + unload guard ------------------------------------------------------------------

let wakeLock: WakeLockSentinel | null = null
let wantWake = false

async function acquireWake(): Promise<void> {
  if (!wantWake || wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    L.debug('screen wake lock acquired')
    wakeLock.addEventListener('release', () => {
      L.debug('screen wake lock released')
      wakeLock = null
    })
  } catch (err) {
    L.warn('wake lock unavailable', err)
    wakeLock = null
  }
}

function releaseWake(): void {
  wantWake = false
  void wakeLock?.release()
  wakeLock = null
}

export function transferActive(): boolean {
  const o = outgoing.value?.snap.value.state
  const i = incoming.value?.snap.value.state
  return o === 'sending' || i === 'receiving'
}

export function initTransferGuards(): void {
  effect(() => {
    const active = transferActive()
    if (active) {
      wantWake = true
      void acquireWake()
    } else releaseWake()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void acquireWake()
  })
  window.addEventListener('beforeunload', (e) => {
    if (transferActive()) {
      e.preventDefault()
      e.returnValue = ''
    }
  })
}
