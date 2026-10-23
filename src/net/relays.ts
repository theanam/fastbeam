/**
 * Relay socket watchdog.
 *
 * Trystero keeps one websocket per relay for the life of the page and reconnects it only when it fires
 * "close". Leaving and re-joining rooms reuses the same socket. After sleep, a spell in the background or
 * a network change a socket can stay "open" while nothing gets through, and the device silently stops
 * announcing and hearing announcements. Every announce draws an OK from the relay, so an open socket
 * that has heard nothing for a while is dead: closing it makes Trystero reconnect, resubscribe and
 * replay its announcements.
 */
import { getRelaySockets } from 'trystero/nostr'
import { RELAY_BACKOFF_MAX_MS, RELAY_CHECK_MS, RELAY_QUIET_MS } from '../config'
import { logger } from '../state/log'

const L = logger('relay')

/** When each socket last heard anything; a rate-limited one is dated forward (see watchedSockets). */
const lastHeard = new WeakMap<WebSocket, number>()

/** Let Trystero connect before the first summary, so it does not just report every relay as down. */
const FIRST_SUMMARY_MS = 8_000

const relayHost = (url: string) => url.replace(/^wss?:\/\//, '').replace(/\/$/, '')

/**
 * Current relay sockets; any we have not seen before start being watched now. A relay that answers
 * "rate-limited:" makes Trystero stop announcing to it for up to RELAY_BACKOFF_MAX_MS, and a reconnect
 * would not resubscribe until that ends, so its silence is expected and must not get it closed.
 */
function watchedSockets(): [string, WebSocket][] {
  const all = Object.entries(getRelaySockets() as Record<string, WebSocket>)
  for (const [, ws] of all) {
    if (lastHeard.has(ws)) continue
    lastHeard.set(ws, Date.now())
    ws.addEventListener('message', (e: MessageEvent) => {
      const limited = typeof e.data === 'string' && e.data.includes('"rate-limited:')
      lastHeard.set(ws, Date.now() + (limited ? RELAY_BACKOFF_MAX_MS : 0))
    })
    ws.addEventListener('open', () => lastHeard.set(ws, Date.now()))
  }
  return all
}

function closeRelays(list: [string, WebSocket][], reason: string): number {
  if (list.length === 0) return 0
  L.warn(`reconnecting ${list.length} relay(s): ${reason}`, list.map(([url]) => relayHost(url)))
  for (const [, ws] of list) ws.close()
  return list.length
}

/** Close open relay sockets that have heard nothing for `quietMs`. Returns how many were closed. */
export function reviveQuietRelays(reason: string, quietMs = RELAY_QUIET_MS): number {
  const now = Date.now()
  const open = watchedSockets().filter(([, ws]) => ws.readyState === WebSocket.OPEN)
  return closeRelays(open.filter(([, ws]) => now - (lastHeard.get(ws) ?? now) >= quietMs), `quiet: ${reason}`)
}

/** Close every open relay socket, quiet or not: after a network change none of them can be trusted. */
export function reconnectRelays(reason: string): number {
  return closeRelays(watchedSockets().filter(([, ws]) => ws.readyState === WebSocket.OPEN), reason)
}

let lastSummary = ''

/** Log how many relays are connected, but only when that changes. */
function logRelaySummary(): void {
  const all = watchedSockets()
  if (all.length === 0) return
  const down = all.filter(([, ws]) => ws.readyState !== WebSocket.OPEN).map(([url]) => relayHost(url))
  const summary = `${all.length - down.length}/${all.length} relays connected`
  if (summary === lastSummary) return
  lastSummary = summary
  if (down.length === all.length) L.error(summary)
  else if (down.length > 0) L.warn(summary, { down })
  else L.info(summary)
}

/**
 * Check the sockets every RELAY_CHECK_MS while `announcing()` says we have rooms (otherwise silence is
 * expected). A tick that arrives far too late means the machine slept, so the check runs straight away.
 */
export function initRelayWatch(announcing: () => boolean): void {
  let lastTick = Date.now()
  window.setTimeout(logRelaySummary, FIRST_SUMMARY_MS)
  window.setInterval(() => {
    const now = Date.now()
    const gap = now - lastTick
    lastTick = now
    if (!announcing()) return
    reviveQuietRelays(gap > RELAY_CHECK_MS * 3 ? `timers stalled ${Math.round(gap / 1000)} s (sleep?)` : 'no traffic')
    logRelaySummary()
  }, RELAY_CHECK_MS)
}
