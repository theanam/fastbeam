import { mediaKind, type ViewerItem } from '../../state/media'
import { incoming, outgoing } from '../../transfer/manager'
import type { SavedFile } from '../../transfer/sinks'

/** Media the receiver can still read back, as gallery items, keyed by file index. */
export function galleryFrom(saved: SavedFile[]): Map<number, ViewerItem> {
  const out = new Map<number, ViewerItem>()
  saved.forEach((s, i) => {
    const kind = mediaKind(s.type, s.name)
    if (kind && s.blob) out.set(i, { name: s.name, size: s.size, type: s.type, kind, blob: s.blob })
  })
  return out
}

export interface Row {
  key: string
  name: string
  size: number
  done: number
  complete: boolean
}

export interface View {
  kind: 'send' | 'receive'
  peerName: string
  peerId: string
  total: number
  done: number
  speed: number
  eta: number | null
  startedAt: number | null
  /** Sender only: everything is queued and we are waiting for the receiver to confirm the tail. */
  finishing: boolean
  /** waiting = offer not answered yet; starting = accepted, no bytes moved yet; running = bytes flowing. */
  phase: 'waiting' | 'starting' | 'running'
  offeredAt: number | null
  rows: Row[]
  cancel: () => void
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function currentView(): View | null {
  const o = outgoing.value?.snap.value
  if (o && (o.state === 'sending' || o.state === 'offered')) {
    const done = Math.min(o.sentBytes, o.ackedBytes + 4 * 1024 * 1024)
    return {
      kind: 'send',
      peerName: o.peerName,
      peerId: o.peerId,
      total: o.totalSize,
      done,
      speed: o.speed,
      eta: o.etaSeconds,
      startedAt: o.startedAt,
      finishing: o.state === 'sending' && o.sentBytes >= o.totalSize && o.ackedBytes < o.totalSize,
      phase: o.state === 'offered' ? 'waiting' : done === 0 ? 'starting' : 'running',
      offeredAt: o.offeredAt,
      rows: o.files.map((f) => ({ key: f.fileId, name: f.name, size: f.size, done: f.sent, complete: f.sent >= f.size })),
      cancel: () => outgoing.value?.cancel(),
    }
  }
  const i = incoming.value?.snap.value
  if (i && i.state === 'receiving') {
    return {
      kind: 'receive',
      peerName: i.peerName,
      peerId: i.peerId,
      total: i.totalSize,
      done: i.receivedBytes,
      speed: i.speed,
      eta: i.etaSeconds,
      startedAt: i.startedAt,
      finishing: false,
      phase: i.receivedBytes === 0 ? 'starting' : 'running',
      offeredAt: i.offeredAt,
      rows: i.files.map((f) => ({ key: f.fileId, name: f.name, size: f.size, done: f.received, complete: f.complete })),
      cancel: () => incoming.value?.cancel(),
    }
  }
  return null
}
