import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeSocket extends EventTarget {
  readyState: number = WebSocket.OPEN
  close = vi.fn(() => {
    this.readyState = WebSocket.CLOSING
  })
}

const sockets: Record<string, FakeSocket> = {}
vi.mock('trystero/nostr', () => ({ getRelaySockets: () => sockets }))

const { reconnectRelays, reviveQuietRelays } = await import('./relays')

describe('reviveQuietRelays', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    for (const k of Object.keys(sockets)) delete sockets[k]
  })

  it('reconnects an open socket that has heard nothing, and leaves a chatty one alone', () => {
    const quiet = (sockets['wss://quiet'] = new FakeSocket())
    const chatty = (sockets['wss://chatty'] = new FakeSocket())
    expect(reviveQuietRelays('first look', 60_000)).toBe(0) // first sight starts the clock

    vi.advanceTimersByTime(50_000)
    chatty.dispatchEvent(new Event('message'))
    vi.advanceTimersByTime(20_000)

    expect(reviveQuietRelays('test', 60_000)).toBe(1)
    expect(quiet.close).toHaveBeenCalledOnce()
    expect(chatty.close).not.toHaveBeenCalled()
  })

  it('leaves sockets that are still connecting to Trystero', () => {
    const connecting = (sockets['wss://connecting'] = new FakeSocket())
    connecting.readyState = WebSocket.CONNECTING
    reviveQuietRelays('first look', 1)
    vi.advanceTimersByTime(10_000)
    expect(reviveQuietRelays('test', 1)).toBe(0)
    expect(connecting.close).not.toHaveBeenCalled()
  })

  it('leaves a rate-limited relay alone while Trystero backs off from it', () => {
    const limited = (sockets['wss://limited'] = new FakeSocket())
    reviveQuietRelays('first look', 60_000)
    limited.dispatchEvent(new MessageEvent('message', { data: '["OK","abc",false,"rate-limited: slow down"]' }))
    vi.advanceTimersByTime(10 * 60_000)
    expect(reviveQuietRelays('test', 60_000)).toBe(0)
    vi.advanceTimersByTime(10 * 60_000)
    expect(reviveQuietRelays('test', 60_000)).toBe(1)
  })
})

describe('reconnectRelays', () => {
  afterEach(() => {
    for (const k of Object.keys(sockets)) delete sockets[k]
  })

  it('closes every open socket, even one that just heard something', () => {
    const a = (sockets['wss://a'] = new FakeSocket())
    const connecting = (sockets['wss://b'] = new FakeSocket())
    connecting.readyState = WebSocket.CONNECTING
    a.dispatchEvent(new Event('message'))
    expect(reconnectRelays('back online')).toBe(1)
    expect(a.close).toHaveBeenCalledOnce()
    expect(connecting.close).not.toHaveBeenCalled()
  })
})
