/**
 * Signaling clock.
 *
 * Nostr relays forward an event to a subscription only if the event's timestamp (the sender's clock) is
 * not older than the subscription's "since" (the listener's clock). A device whose clock runs ahead never
 * hears the replies to its own first announces and only meets others at Trystero's next one-minute
 * announce; one that lags is not heard right after others subscribe. Windows clocks drift by tens of
 * seconds. We measure this device's offset against Akamai's time service and hand it to the patched
 * Trystero (patches/@trystero-p2p+nostr+*.patch), which stamps and filters with the corrected time.
 * When the service cannot be reached the device's own clock is used as is: the patched Trystero still
 * looks back 15 s, which covers ordinary drift.
 *
 * The offset is measured at startup and again when the clock may have changed under us: a skewed clock is
 * exactly the kind that gets snapped back, often on wake from sleep, and a stale correction would then put
 * it just as far out the other way.
 */
import {
  CLOCK_CHECK_MS,
  CLOCK_CORRECT_MIN_MS,
  CLOCK_MAX_RTT_MS,
  CLOCK_RETRIES,
  CLOCK_RETRY_MS,
  CLOCK_TIME_TIMEOUT_MS,
  CLOCK_TIME_URL,
} from '../config'
import { logger } from '../state/log'
import { reconnectRelays } from './relays'

const L = logger('clock')

type ClockGlobal = typeof globalThis & { __fastbeamClockOffsetMs?: number }

/** The correction Trystero is using now (0 = none). */
let applied = 0
let measured = false
let running: Promise<void> | null = null

/** Anything before this is not a real answer from the time service. */
const EARLIEST_PLAUSIBLE = Date.UTC(2026, 0, 1)

/**
 * True time minus this device's time in ms, from Akamai's per-request ISO timestamp. Null when it cannot be
 * reached in time, answers with something else (a captive portal) or the round trip was too slow to trust.
 */
export async function measureClockOffset(): Promise<number | null> {
  try {
    const sent = Date.now()
    const res = await fetch(CLOCK_TIME_URL, { cache: 'no-store', signal: AbortSignal.timeout(CLOCK_TIME_TIMEOUT_MS) })
    const body = res.ok ? (await res.text()).trim() : ''
    const received = Date.now()
    const server = /^\d{4}-\d\d-\d\dT/.test(body) ? Date.parse(body) : NaN
    if (!Number.isFinite(server) || server < EARLIEST_PLAUSIBLE || received - sent > CLOCK_MAX_RTT_MS) return null
    return Math.round(server - (sent + received) / 2)
  } catch {
    return null
  }
}

/** Measure and, if the correction moved by CLOCK_CORRECT_MIN_MS or more, apply it. False if unmeasurable. */
export async function syncClock(reason: string): Promise<boolean> {
  const offset = await measureClockOffset()
  if (offset === null) {
    L.debug(`could not reach the time service (${reason})`)
    return false
  }
  const first = !measured
  measured = true
  const next = Math.abs(offset) >= CLOCK_CORRECT_MIN_MS ? offset : 0
  const seconds = Math.abs(offset / 1000).toFixed(1)
  if (Math.abs(next - applied) < CLOCK_CORRECT_MIN_MS) {
    if (first) L.info(`clock is within ${seconds} s of true time`)
    return true
  }
  applied = next
  const g = globalThis as ClockGlobal
  if (next === 0) {
    delete g.__fastbeamClockOffsetMs
    L.info(`clock is right again (within ${seconds} s); correction removed (${reason})`)
  } else {
    g.__fastbeamClockOffsetMs = next
    // A positive offset means true time is later than ours, i.e. this device's clock is behind.
    L.warn(`this device's clock is ${seconds} s ${next > 0 ? 'behind' : 'ahead'}; signaling uses corrected time (${reason})`)
  }
  // Subscriptions carry the old "since"; reconnecting makes Trystero resubscribe and re-announce.
  reconnectRelays('clock correction changed')
  return true
}

/** syncClock with a few retries; concurrent callers share one run. */
function syncSoon(reason: string): Promise<void> {
  running ??= (async () => {
    for (let attempt = 0; attempt <= CLOCK_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((r) => window.setTimeout(r, CLOCK_RETRY_MS))
      if (await syncClock(attempt > 0 ? `${reason}, retry ${attempt}` : reason)) return
    }
    L.warn(`could not reach the time service after ${CLOCK_RETRIES + 1} tries; signaling uses this device's clock as is`)
  })().finally(() => {
    running = null
  })
  return running
}

/**
 * Measure now, and again when the wall clock moves against the monotonic one (the clock was changed, or
 * the machine slept) or the browser comes back online. The check itself is local; only a detected change
 * costs a request. A failed measurement keeps whatever correction is in place (none at startup).
 */
export function initClockSync(): void {
  const drift = () => Date.now() - performance.now()
  let last = drift()
  void syncSoon('startup')
  window.setInterval(() => {
    const now = drift()
    if (Math.abs(now - last) < CLOCK_CORRECT_MIN_MS) return
    L.debug(`wall clock moved ${Math.round((now - last) / 1000)} s against the monotonic clock`)
    last = now
    void syncSoon('clock changed or machine slept')
  }, CLOCK_CHECK_MS)
  window.addEventListener('online', () => void syncSoon('back online'))
}
