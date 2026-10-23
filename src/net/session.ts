/**
 * Turns an open PeerLink into a Peer: hello exchange, ping/timeout, routing of control and binary
 * frames to the transfer manager, and cleanup when the link closes.
 *
 * Resilience rules (iOS Safari drops ICE for a few seconds all the time):
 *  - Missed pings mark the peer "reconnecting" instead of removing it.
 *  - A link is closed only when ICE really fails or after a long silence.
 *  - When the last link closes the peer stays listed for PEER_GRACE_MS; a fresh link merges back in.
 */
import { effect } from '@preact/signals'
import { LINK_SILENCE_CLOSE_MS, PEER_GRACE_MS, PEER_TIMEOUT_MS, PING_INTERVAL_MS, PROTOCOL } from '../config'
import type { DeviceOs, DeviceType } from '../state/device'
import { device, deviceId } from '../state/identity'
import { logger } from '../state/log'
import { getPeer, peers, removePeer, setPeer, updatePeer, type Peer } from '../state/peers'

const L = logger('session')
import { deviceName, discoverable } from '../state/settings'
import { toast } from '../state/toast'
import { handleChunk, handleControl, onPeerGone } from '../transfer/manager'
import { verificationCode } from '../transfer/protocol'
import { rejoinRooms } from './discovery'
import { rejoinHostRoom } from './pairing'
import { realStates } from './patientPc'
import type { ControlMessage, PeerLink } from './peerLink'

/** No reply to the resume ping within this long means the transport died while we were suspended. */
const RESUME_PROBE_MS = 4_000
/** Hidden longer than this and the relay sockets are assumed dead too. */
const RESUME_REJOIN_AFTER_MS = 45_000

export interface HelloMessage extends ControlMessage {
  type: 'hello'
  deviceId: string
  name: string
  deviceType: DeviceType
  os?: DeviceOs
  platform: string
  browser: string
  protocol: number
  discoverable: boolean
}

export function helloMessage(): HelloMessage {
  return {
    type: 'hello',
    deviceId: deviceId.value,
    name: deviceName.value,
    deviceType: device.deviceType,
    os: device.os,
    platform: device.platform,
    browser: device.browser,
    protocol: PROTOCOL,
    discoverable: discoverable.value,
  }
}

export function isHello(msg: ControlMessage): msg is HelloMessage {
  return (
    msg.type === 'hello' &&
    typeof msg.deviceId === 'string' &&
    typeof msg.name === 'string' &&
    typeof msg.protocol === 'number'
  )
}

/** Resolve with the first control message that `accept` returns true for, or reject on timeout/close. */
export function waitForControl(
  link: PeerLink,
  timeoutMs: number,
  accept: (msg: ControlMessage) => boolean,
): Promise<ControlMessage> {
  return new Promise((resolve, reject) => {
    const prevControl = link.onControl
    const prevClose = link.onClose
    const timer = window.setTimeout(() => finish(new Error('timeout')), timeoutMs)
    const finish = (err: Error | null, msg?: ControlMessage) => {
      window.clearTimeout(timer)
      link.onControl = prevControl
      link.onClose = prevClose
      if (err) reject(err)
      else if (msg) resolve(msg)
    }
    link.onControl = (msg) => {
      if (accept(msg)) finish(null, msg)
      else prevControl?.(msg)
    }
    link.onClose = () => {
      prevClose?.()
      finish(new Error('closed'))
    }
  })
}

/**
 * Send `msg` now and again every `everyMs` until `until` settles or the link closes. Negotiated channels
 * are created independently on each side, so the first frame in a direction can land before the other
 * side's channel exists; repeating it makes the introduction order-independent.
 */
export function sendUntil(link: PeerLink, msg: ControlMessage, until: Promise<unknown>, everyMs = 1000): void {
  let sent = 0
  const send = () => {
    link.sendControl(msg)
    sent++
    if (sent === 1 || sent % 5 === 0) L.debug(`tx ${msg.type} (${sent}×)`, { dc: link.open ? 'open' : 'not open', buffered: link.bufferedAmount })
  }
  send()
  const timer = window.setInterval(() => {
    if (!link.open) {
      window.clearInterval(timer)
      return
    }
    send()
  }, everyMs)
  const stop = () => window.clearInterval(timer)
  until.then(stop, stop)
}

interface AttachFlags {
  paired: boolean
  passwordVerified: boolean
}

interface LinkTimers {
  ping: number
  stale: number
  silence: number
}

const linkTimers = new WeakMap<PeerLink, LinkTimers>()
const graceTimers = new Map<string, number>()

function cleanName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Device'
}

function clearLinkTimers(link: PeerLink): void {
  const t = linkTimers.get(link)
  if (!t) return
  window.clearInterval(t.ping)
  window.clearTimeout(t.stale)
  window.clearTimeout(t.silence)
  linkTimers.delete(link)
}

/** Recompute `online` from the peer's links. */
function refreshOnline(id: string): void {
  const p = getPeer(id)
  if (!p) return
  const healthy = p.links.some((l) => l.open && l.health === 'open')
  if (p.online !== healthy) updatePeer(id, { online: healthy })
}

/** Register a peer once hellos have been exchanged on `link`. Safe to call for a second link to the same device. */
export async function attachPeer(link: PeerLink, hello: HelloMessage, flags: AttachFlags): Promise<Peer> {
  if (hello.deviceId === deviceId.value) {
    // Another tab of ours on the same network: ignore it, but keep the connection or the tabs reconnect forever.
    link.close({ keepTransport: true })
    throw new Error('self')
  }
  const fps = link.fingerprints()
  const code = fps ? await verificationCode(fps.local, fps.remote) : '------'
  const id = hello.deviceId

  // A link that came back inside the grace window cancels the removal.
  const pendingRemoval = graceTimers.get(id)
  if (pendingRemoval) {
    window.clearTimeout(pendingRemoval)
    graceTimers.delete(id)
  }

  const existing = getPeer(id)
  const peer: Peer = existing
    ? {
        ...existing,
        name: cleanName(hello.name),
        deviceType: hello.deviceType,
        ...(hello.os ? { os: hello.os } : {}),
        platform: hello.platform,
        browser: hello.browser,
        protocol: hello.protocol,
        discoverable: hello.discoverable,
        paired: existing.paired || flags.paired,
        passwordVerified: existing.passwordVerified || flags.passwordVerified,
        verificationCode: existing.links.length ? existing.verificationCode : code,
        links: [...existing.links.filter((l) => l.open && l !== link), link],
        lastSeen: Date.now(),
        online: true,
        goneAt: null,
      }
    : {
        deviceId: id,
        name: cleanName(hello.name),
        deviceType: hello.deviceType,
        ...(hello.os ? { os: hello.os } : {}),
        platform: hello.platform,
        browser: hello.browser,
        protocol: hello.protocol,
        discoverable: hello.discoverable,
        paired: flags.paired,
        passwordVerified: flags.passwordVerified,
        verificationCode: code,
        flash: false,
        links: [link],
        lastSeen: Date.now(),
        online: true,
        goneAt: null,
      }
  setPeer(peer)
  const rebound = link.attachedTo === id
  link.attachedTo = id
  if (!existing) toast(`${peer.name} joined`)
  L.info(rebound ? `${peer.name}: link re-introduced (now paired: ${peer.paired})` : existing ? `extra link to ${peer.name}` : `peer attached: ${peer.name}`, {
    links: peer.links.length,
    paired: peer.paired,
    locked: peer.passwordVerified,
    code: peer.verificationCode,
    platform: `${peer.platform} · ${peer.browser}`,
  })

  // Exactly one side restarts ICE on trouble, to avoid offer glare.
  link.restartsIce = deviceId.value < id
  L.debug(`${peer.name}: this side ${link.restartsIce ? 'will' : 'will not'} drive ICE restarts`)

  const armStale = () => {
    const t = linkTimers.get(link)
    if (!t) return
    window.clearTimeout(t.stale)
    window.clearTimeout(t.silence)
    t.stale = window.setTimeout(() => {
      // Quiet for 15 s: show it as reconnecting, keep the link.
      const p = getPeer(id)
      if (p && !p.links.some((l) => l !== link && l.health === 'open')) {
        L.warn(`${p.name}: no ping for ${PEER_TIMEOUT_MS / 1000} s, marking reconnecting`)
        updatePeer(id, { online: false })
      }
    }, PEER_TIMEOUT_MS)
    t.silence = window.setTimeout(() => {
      L.warn(`${getPeer(id)?.name ?? id.slice(0, 8)}: silent for ${LINK_SILENCE_CLOSE_MS / 1000} s, closing link`)
      link.close()
    }, LINK_SILENCE_CLOSE_MS)
  }
  const touch = () => {
    const p = getPeer(id)
    if (p && !p.online) L.info(`${p.name}: heard again, back online`)
    updatePeer(id, { lastSeen: Date.now(), online: true, goneAt: null })
    armStale()
  }

  if (rebound) return peer // handlers and timers are already wired to this peer
  clearLinkTimers(link)
  linkTimers.set(link, {
    ping: window.setInterval(() => link.sendControl({ type: 'ping' }), PING_INTERVAL_MS),
    stale: 0,
    silence: 0,
  })
  armStale()

  link.onHealth = (h) => {
    const p = getPeer(id)
    if (h === 'degraded') L.warn(`${p?.name ?? id.slice(0, 8)}: ICE disconnected, waiting / restarting in the background`)
    else if (h === 'open') L.info(`${p?.name ?? id.slice(0, 8)}: ICE connected again`)
    refreshOnline(id)
  }
  link.onControl = (msg) => {
    touch()
    if (msg.type === 'ping') return
    if (isHello(msg)) {
      updatePeer(id, { name: cleanName(msg.name), discoverable: msg.discoverable, protocol: msg.protocol })
      return
    }
    const p = getPeer(id)
    if (p) handleControl(p, link, msg)
  }
  link.onChunk = (frame) => {
    const p = getPeer(id)
    if (p) handleChunk(p, link, frame)
  }
  link.onClose = () => {
    clearLinkTimers(link)
    const p = getPeer(id)
    if (!p) return
    const links = p.links.filter((l) => l !== link)
    if (links.some((l) => l.open)) {
      L.info(`${p.name}: one link closed, ${links.length} left`)
      updatePeer(id, { links })
      refreshOnline(id)
      return
    }
    // Last link gone: transfers on it cannot continue, but the device stays on screen for a while.
    L.warn(`${p.name}: last link closed, keeping it listed for ${PEER_GRACE_MS / 1000} s`)
    onPeerGone(p, link)
    updatePeer(id, { links, online: false, goneAt: Date.now() })
    const timer = window.setTimeout(() => {
      graceTimers.delete(id)
      const cur = getPeer(id)
      if (!cur || cur.links.some((l) => l.open)) return
      L.info(`${cur.name}: grace period over, removed`)
      removePeer(id)
      toast(`${cur.name} left`)
    }, PEER_GRACE_MS)
    graceTimers.set(id, timer)
  }
  return peer
}

/**
 * Swap hellos on a fresh link. Ours is repeated until theirs arrives and then sent once more: the other
 * side stops repeating the moment it hears us, so if its first hello was dropped before our channel
 * existed we would never hear it. Their hello arriving proves their channel exists, so the last copy of
 * ours lands and they are not left waiting until their timeout closes the connection.
 */
export async function exchangeHello(link: PeerLink, timeoutMs: number): Promise<HelloMessage> {
  // The first handler attached receives anything that arrived early, so the waiter must be first.
  const theirs = waitForControl(link, timeoutMs, (m) => {
    if (isHello(m)) L.debug(`rx hello from ${String(m.name)}`)
    else L.debug(`rx ${m.type} before hello`)
    return isHello(m)
  })
  sendUntil(link, helloMessage(), theirs)
  const hello = (await theirs) as HelloMessage
  link.sendControl(helloMessage())
  return hello
}

/** Same-network introduction: both sides say hello straight away. */
export async function introduceDiscovery(link: PeerLink): Promise<void> {
  await link.ready
  L.debug('channel open, exchanging hello', { ice: link.pc.iceConnectionState, sctp: link.pc.sctp?.state })
  const hello = await exchangeHello(link, PEER_TIMEOUT_MS)
  await attachPeer(link, hello, { paired: false, passwordVerified: false })
}

/** Keep names and visibility live on every connected peer; nudge pings when the tab comes back. */
export function initSessionBroadcast(): void {
  let first = true
  effect(() => {
    const msg = helloMessage()
    if (first) {
      first = false
      return
    }
    for (const p of peers.peek().values()) for (const l of p.links) l.sendControl(msg)
  })
  const nudge = () => {
    for (const p of peers.peek().values()) for (const l of p.links) l.sendControl({ type: 'ping' })
  }

  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    const hiddenFor = hiddenAt ? Date.now() - hiddenAt : 0
    hiddenAt = 0
    void checkLinksAfterResume(hiddenFor)
  })
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) void checkLinksAfterResume(RESUME_REJOIN_AFTER_MS + 1)
  })
  window.addEventListener('online', nudge)
}

/**
 * Back from the background: mobile browsers kill WebRTC transports and relay sockets without telling the
 * page, and our timers were frozen. Probe every link with a ping; anything silent is closed at once so
 * Trystero re-handshakes it, and after a long absence (or any dead link) the relay rooms are rejoined.
 */
async function checkLinksAfterResume(hiddenForMs: number): Promise<void> {
  const all = [...peers.peek().values()].flatMap((p) => p.links.map((l) => ({ peer: p, link: l })))
  if (all.length === 0) {
    if (hiddenForMs > RESUME_REJOIN_AFTER_MS) void rejoinRooms(`hidden ${Math.round(hiddenForMs / 1000)} s`)
    return
  }
  L.info(`resumed after ${Math.round(hiddenForMs / 1000)} s hidden; probing ${all.length} link(s)`)
  let dead = 0
  const before = new Map<PeerLink, number>()
  for (const { peer, link } of all) {
    const st = realStates(link.pc)
    if (!link.open || st.connection === 'failed' || st.connection === 'closed' || st.ice === 'failed' || st.ice === 'closed') {
      L.warn(`${peer.name}: transport died while hidden (${st.connection}/${st.ice}); closing link`)
      link.close()
      dead++
      continue
    }
    before.set(link, peer.lastSeen)
    link.sendControl({ type: 'ping' })
  }
  await new Promise((r) => window.setTimeout(r, RESUME_PROBE_MS))
  for (const { peer, link } of all) {
    const seen = before.get(link)
    if (seen === undefined) continue
    const now = getPeer(peer.deviceId)?.lastSeen ?? 0
    if (now <= seen) {
      L.warn(`${peer.name}: no answer ${RESUME_PROBE_MS / 1000} s after resume; closing link to reconnect`)
      link.close()
      dead++
    }
  }
  if (dead > 0 || hiddenForMs > RESUME_REJOIN_AFTER_MS) {
    await rejoinRooms(dead > 0 ? `${dead} dead link(s) after resume` : `hidden ${Math.round(hiddenForMs / 1000)} s`)
    void rejoinHostRoom()
  }
}
