/** Auto-discovery: STUN probe → room keys → join; re-run on network changes. */
import { signal } from '@preact/signals'
import { REDISCOVER_HIDDEN_MS } from '../config'
import { logger } from '../state/log'
import { nat } from '../state/network'

const L = logger('discover')
import { roomId } from './hash'
import { createPeerLink, runIntroduction } from './peerLink'
import { introduceDiscovery } from './session'
import { trysteroSignaling, type RoomHandle } from './signaling'
import { stunProbe, type ProbeResult } from './stunProbe'

const rooms = new Map<string, RoomHandle>()

export const probing = signal(false)
export const lastProbe = signal<ProbeResult | null>(null)
/** True once at least one discovery room is joined. */
export const discovering = signal(false)

async function roomIdsFor(p: ProbeResult): Promise<string[]> {
  const ids: string[] = []
  if (p.ipv4) ids.push(await roomId('v4', p.ipv4))
  if (p.ipv6Prefix) ids.push(await roomId('v6', p.ipv6Prefix))
  return ids
}

function joinDiscoveryRoom(id: string): RoomHandle {
  L.info(`joining room ${id.slice(0, 8)}…`)
  return trysteroSignaling.join(id, {
    onPeer(peerId, pc) {
      L.info(`peer connected in ${id.slice(0, 8)}`, { peerId: peerId.slice(0, 8), ice: pc.iceConnectionState })
      const link = createPeerLink(pc)
      if (link.attachedTo || link.introducing) {
        L.debug(`${peerId.slice(0, 8)} is already ${link.attachedTo ? 'attached' : 'being introduced'} on a shared connection; skipping`)
        return
      }
      runIntroduction(link, () => introduceDiscovery(link)).catch((err: unknown) => {
        L.warn(`introduction failed for ${peerId.slice(0, 8)}`, err)
        link.close()
      })
    },
    onPeerLeave(peerId) {
      L.debug(`signaling says peer left ${id.slice(0, 8)}`, peerId.slice(0, 8))
    },
    onError(error, peerId) {
      L.warn(`room ${id.slice(0, 8)} error`, { error, peerId: peerId.slice(0, 8) })
    },
  })
}

let running: Promise<void> | null = null

/**
 * Probe and (re)join rooms. Leaves rooms whose key changed before joining the new ones.
 * Re-runs keep the current badge on screen; only the first run (or an explicit "Run again") shows
 * "Checking network", so a background re-probe never flickers the header.
 */
export function runDiscovery(opts: { announce?: boolean; reason?: string } = {}): Promise<void> {
  if (running) return running
  running = (async () => {
    probing.value = true
    if (lastProbe.value === null || opts.announce) nat.value = 'checking'
    L.info(`STUN probe starting${opts.reason ? ` (${opts.reason})` : ''}`)
    const t0 = Date.now()
    let probe: ProbeResult
    try {
      probe = await stunProbe()
    } catch (err) {
      L.error('STUN probe threw', err)
      probe = { nat: 'unknown' }
    }
    lastProbe.value = probe
    nat.value = probe.nat
    probing.value = false
    L.info(`STUN probe done in ${Date.now() - t0} ms`, { nat: probe.nat, ipv4: probe.ipv4, ipv6Prefix: probe.ipv6Prefix })

    const wanted = new Set(await roomIdsFor(probe))
    if (wanted.size === 0) L.warn('no network key: auto-discovery unavailable, codes still work')
    for (const [id, handle] of rooms) {
      if (!wanted.has(id)) {
        rooms.delete(id)
        L.info(`leaving room ${id.slice(0, 8)}… (key changed)`)
        void handle.leave()
      }
    }
    for (const id of wanted) {
      if (!rooms.has(id)) rooms.set(id, joinDiscoveryRoom(id))
    }
    discovering.value = rooms.size > 0
  })().finally(() => {
    running = null
  })
  return running
}

/**
 * Leave and re-join every discovery room. Used after the tab comes back from the background: iOS and
 * Android kill relay websockets silently, and a room on a zombie socket never announces again.
 */
export async function rejoinRooms(reason: string): Promise<void> {
  if (rooms.size === 0) {
    void runDiscovery()
    return
  }
  L.info(`re-joining ${rooms.size} discovery room(s): ${reason}`)
  const ids = [...rooms.keys()]
  for (const id of ids) {
    const handle = rooms.get(id)
    rooms.delete(id)
    try {
      await handle?.leave()
    } catch {
      /* already gone */
    }
  }
  for (const id of ids) rooms.set(id, joinDiscoveryRoom(id))
}

export function initDiscovery(): void {
  void runDiscovery()

  window.addEventListener('online', () => void runDiscovery({ reason: 'browser back online' }))
  window.addEventListener('offline', () => L.warn('browser reports offline'))

  // The Network Information API fires "change" on every bandwidth estimate; only a change of network
  // type (wifi → cellular, …) means our public address may differ. Everything else is ignored.
  const conn = (navigator as Navigator & { connection?: EventTarget & { type?: string; effectiveType?: string } }).connection
  if (conn) {
    let lastType = conn.type ?? 'unknown'
    conn.addEventListener('change', () => {
      const type = conn.type ?? 'unknown'
      if (type === lastType) {
        L.debug('connection estimate changed; same network type, ignoring')
        return
      }
      lastType = type
      void runDiscovery({ reason: `network type is now ${type}` })
    })
  }

  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > REDISCOVER_HIDDEN_MS) {
      void runDiscovery({ reason: `tab visible after ${Math.round((Date.now() - hiddenAt) / 1000)} s hidden` })
    }
  })
}
