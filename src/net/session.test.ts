import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControlMessage, PeerLink } from './peerLink'
import { exchangeHello } from './session'

// jsdom has no WebRTC; patientPc extends RTCPeerConnection when the import graph loads.
vi.hoisted(() => {
  ;(globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection ??= class {}
})

/**
 * Two ends of one connection. A frame sent to an end whose channel does not exist yet is dropped, which is
 * what a browser does with data for a negotiated channel the other side has not created.
 */
function linkPair() {
  const ends: { link: PeerLink; created: boolean; received: ControlMessage[] }[] = []
  const make = (i: number): PeerLink => {
    let handler: ((m: ControlMessage) => void) | null = null
    return {
      open: true,
      onClose: null,
      get onControl() {
        return handler
      },
      set onControl(fn) {
        handler = fn
      },
      sendControl(msg: ControlMessage) {
        const other = ends[1 - i]!
        if (!other.created) return
        other.received.push(msg)
        queueMicrotask(() => other.link.onControl?.(msg))
      },
    } as unknown as PeerLink
  }
  ends.push({ link: make(0), created: true, received: [] }, { link: make(1), created: false, received: [] })
  return ends
}

describe('exchangeHello', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('gets our hello through when our first one was dropped before their channel existed', async () => {
    const [a, b] = linkPair()
    // A opens first and says hello into the void.
    const aGot = exchangeHello(a!.link, 15_000)
    expect(b!.received).toHaveLength(0)

    // B's channel appears and B says hello; A hears it and stops repeating.
    b!.created = true
    const bGot = exchangeHello(b!.link, 15_000)
    await vi.advanceTimersByTimeAsync(0)
    await expect(aGot).resolves.toMatchObject({ type: 'hello' })

    // Without A's final hello, B would hear nothing more and wait until its timeout closed the connection.
    await vi.advanceTimersByTimeAsync(0)
    expect(b!.received.map((m) => m.type)).toContain('hello')
    await expect(bGot).resolves.toMatchObject({ type: 'hello' })
  })
})
