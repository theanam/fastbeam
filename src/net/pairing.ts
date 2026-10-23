/**
 * Manual pairing: host a code (screen 7) or join one (screens 8 → 10 → 9 → Home, or 11).
 * The room is derived from the code alone; the optional password is checked on the data channel
 * before any hello (build-notes §4).
 */
import { signal } from '@preact/signals'
import {
  CANONICAL_ORIGIN,
  CODE_ALPHABET,
  CODE_LENGTH,
  CODE_TTL_MS,
  JOIN_ERROR_GRACE_MS,
  PAIR_RETRY_MS,
  PAIR_TIMEOUT_MS,
  PASSWORD_MIN,
  PEER_TIMEOUT_MS,
} from '../config'
import { logger } from '../state/log'
import { nat } from '../state/network'
import type { NatKind } from './stunProbe'

const L = logger('pair')
import { flashPeer, type Peer } from '../state/peers'
import { toast } from '../state/toast'
import { b64url, fromB64url, roomId } from './hash'
import {
  AuthLimiter,
  authMac,
  deriveAuthKeyInWorker,
  randomNonce,
  verifyAuthMac,
} from './pairAuth'
import { createPeerLink, runIntroduction, type ControlMessage, type PeerLink } from './peerLink'
import { attachPeer, exchangeHello, helloMessage, isHello, sendUntil, waitForControl, type HelloMessage } from './session'
import { trysteroSignaling, type RoomHandle } from './signaling'
import { suggestPassword } from './wordlist'

// ---- Codes -------------------------------------------------------------------------------------

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return s
}

/** Upper-case, strip spaces/dashes/dots. Does not validate. */
export function normalizeCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-·.]/g, '')
}

export function isCodeChar(ch: string): boolean {
  return ch.length === 1 && CODE_ALPHABET.includes(ch.toUpperCase())
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every(isCodeChar)
}

/** Extract a code from a pasted code, a fastbeam link, or a link to this origin. */
export function codeFromText(text: string): string | null {
  const t = text.trim()
  const direct = normalizeCodeInput(t)
  if (isValidCode(direct)) return direct
  try {
    const u = new URL(t)
    const okHost = u.origin === CANONICAL_ORIGIN || u.origin === location.origin
    if (!okHost) return null
    return codeFromHash(u.hash)
  } catch {
    return null
  }
}

export function codeFromHash(hash: string): string | null {
  const h = hash.replace(/^#/, '')
  const m = /^(?:pair=)?([A-Za-z0-9]{6})$/.exec(h)
  if (!m?.[1]) return null
  const code = normalizeCodeInput(m[1])
  return isValidCode(code) ? code : null
}

export function pairLink(code: string): string {
  return `${CANONICAL_ORIGIN}/#${code}`
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)}·${code.slice(3)}`
}

// ---- Host --------------------------------------------------------------------------------------

export interface HostState {
  code: string
  /** null while a joiner is connecting: the code never rotates under someone mid-handshake. */
  expiresAt: number | null
  locked: boolean
  password: string
  /** Set while the KDF runs for a new password. */
  deriving: boolean
}

export const host = signal<HostState | null>(null)

interface HostRoom {
  code: string
  handle: RoomHandle
  limiter: AuthLimiter
  links: Set<PeerLink>
  expiry: number
  /** Absolute deadline the expiry timer counts towards; kept so a failed introduction can re-arm it. */
  deadline: number
  retired: boolean
}

function armExpiry(room: HostRoom): void {
  window.clearTimeout(room.expiry)
  const ms = Math.max(5_000, room.deadline - Date.now())
  room.expiry = window.setTimeout(() => {
    if (hostRoom === room) rotateCode()
  }, ms)
  const cur = host.value
  if (cur && cur.code === room.code) host.value = { ...cur, expiresAt: room.deadline }
}

/** A joiner is talking to us: freeze the countdown so the code cannot change under them. */
function pauseExpiry(room: HostRoom): void {
  window.clearTimeout(room.expiry)
  room.expiry = 0
  const cur = host.value
  if (cur && cur.code === room.code && cur.expiresAt !== null) host.value = { ...cur, expiresAt: null }
}

let hostRoom: HostRoom | null = null
const retiredRooms = new Set<HostRoom>()
let hostKey: Promise<CryptoKey> | null = null
let hostKeyFor = ''
let hostPasswordTimer = 0

function retire(room: HostRoom): void {
  room.retired = true
  window.clearTimeout(room.expiry)
  if (room.links.size === 0) void room.handle.leave()
  else retiredRooms.add(room)
}

function dropFromRoom(room: HostRoom, link: PeerLink): void {
  room.links.delete(link)
  if (room.retired && room.links.size === 0) {
    retiredRooms.delete(room)
    void room.handle.leave()
  }
}

async function ensureHostKey(password: string, code: string): Promise<CryptoKey> {
  const tag = `${code}:${password}`
  if (!hostKey || hostKeyFor !== tag) {
    hostKeyFor = tag
    const h = host.value
    if (h) host.value = { ...h, deriving: true }
    hostKey = deriveAuthKeyInWorker(password, code).finally(() => {
      const cur = host.value
      if (cur && hostKeyFor === tag) host.value = { ...cur, deriving: false }
    })
  }
  return hostKey
}

async function hostIntro(room: HostRoom, link: PeerLink, previous: Promise<unknown> | null): Promise<void> {
  await link.ready
  if (previous) {
    L.debug(`code ${room.code}: connection is being introduced by another room; waiting`)
    await previous.catch(() => {})
    if (!link.open) throw new Error('shared link closed before the code introduction')
  }
  room.links.add(link)
  const prevClose = link.onClose
  link.onClose = () => {
    prevClose?.()
    dropFromRoom(room, link)
  }

  const h = host.value
  // A code is single-use: once a peer has paired through this room (or the code moved on for any other
  // reason) nobody else gets in, whatever the lock state. Tell them why, then drop the link.
  if (room.retired || !h || h.code !== room.code) {
    L.warn(`rejected a join on retired code ${room.code}`)
    // Repeat for a few seconds: on a shared connection the joiner's waiter may be installed only after
    // its discovery introduction finishes, and there is no reply to tell us when it heard us.
    const stop = new Promise<void>((resolve) => window.setTimeout(resolve, 8_000))
    sendUntil(link, { type: 'code-expired' }, stop)
    if (!link.attachedTo) void stop.then(() => link.close())
    return
  }
  const locked = h.locked && h.password.length >= PASSWORD_MIN
  let passwordVerified = false
  L.info(`someone joined code ${room.code}`, { locked })
  pauseExpiry(room)
  // If this introduction dies without pairing, the clock resumes from where it stopped.
  const prevClose2 = link.onClose
  link.onClose = () => {
    prevClose2?.()
    if (hostRoom === room && !room.retired) {
      L.debug(`joiner left code ${room.code} before pairing; expiry resumes`)
      armExpiry(room)
    }
  }

  if (locked) {
    const key = await ensureHostKey(h.password, room.code)
    const fps = link.fingerprints()
    if (!fps) throw new Error('no fingerprints')
    const nH = randomNonce()
    const firstProof = waitForControl(link, CODE_TTL_MS, (m) => m.type === 'auth-proof')
    sendUntil(link, { type: 'auth-required', nH: b64url(nH), name: helloMessage().name }, firstProof)

    for (let attempt = 0; ; attempt++) {
      const msg = attempt === 0 ? await firstProof : await waitForControl(link, CODE_TTL_MS, (m) => m.type === 'auth-proof')
      const nJ = typeof msg.nJ === 'string' ? fromB64url(msg.nJ) : null
      const mac = typeof msg.mac === 'string' ? fromB64url(msg.mac) : null
      // One attempt per 2 s: hold the verdict rather than failing an honest quick retry.
      const wait = room.limiter.waitMs()
      if (wait > 0) await new Promise((r) => window.setTimeout(r, wait))
      room.limiter.begin()
      // fpH is ours (local), fpJ is theirs (remote).
      const ok = !!nJ && !!mac && nJ.length === 16 && (await verifyAuthMac(key, 'J', nH, nJ, fps.local, fps.remote, mac))
      if (ok && nJ) {
        const reply = await authMac(key, 'H', nH, nJ, fps.local, fps.remote)
        link.sendControl({ type: 'auth-ok', mac: b64url(reply) })
        passwordVerified = true
        L.info(`password verified for code ${room.code}`)
        break
      }
      const rotate = room.limiter.fail()
      L.warn(`wrong password on code ${room.code}`, { triesLeft: room.limiter.triesLeft })
      toast(`Wrong password attempt (${room.limiter.triesLeft} left)`)
      link.sendControl({ type: 'auth-fail', triesLeft: room.limiter.triesLeft })
      if (rotate) {
        L.warn(`too many failures, rotating code ${room.code}`)
        toast('Too many wrong tries — here’s a new code')
        if (!link.attachedTo) link.close()
        rotateCode()
        return
      }
    }
  }

  if (!locked) {
    // Explicit consent handshake: plain hellos also fly on a connection shared with discovery, so they
    // must never count as "you're in". Only a pair-join carrying this code does.
    const joined = waitForControl(link, PEER_TIMEOUT_MS, (m) => m.type === 'pair-join' && m.code === room.code)
    sendUntil(link, { type: 'pair-open', code: room.code }, joined)
    await joined
  }
  // Nothing else may slip in while this introduction completes.
  room.retired = true
  const hello = await exchangeHello(link, PEER_TIMEOUT_MS)
  const peer = await attachPeer(link, hello, { paired: true, passwordVerified })
  flashPeer(peer.deviceId)
  // The code is single-use: show a fresh one, keep this room alive for the peer that used it.
  if (hostRoom === room) rotateCode(true)
}

function openHostRoom(code: string): void {
  void roomId('code', code).then((id) => {
    if (host.value?.code !== code) return
    const room: HostRoom = {
      code,
      handle: trysteroSignaling.join(id, {
        onPeer(_peerId, pc) {
          const link = createPeerLink(pc)
          runIntroduction(link, (previous) => hostIntro(room, link, previous)).catch((err: unknown) => {
            L.warn(`host introduction on ${room.code} ended: ${err instanceof Error ? err.message : String(err)}`)
            link.close()
          })
        },
        onPeerLeave() {},
      }),
      limiter: new AuthLimiter(),
      links: new Set(),
      expiry: 0,
      deadline: host.value?.expiresAt ?? Date.now() + CODE_TTL_MS,
      retired: false,
    }
    hostRoom = room
    armExpiry(room)
  })
}

/** Re-join the active code room on a fresh relay socket (after the tab was in the background). */
export async function rejoinHostRoom(): Promise<void> {
  const cur = host.value
  const room = hostRoom
  if (!cur || !room || room.retired) return
  if (room.links.size > 0) return // someone is connected through it; leaving would drop them
  L.info(`re-joining code room ${room.code} after resume`)
  hostRoom = null
  window.clearTimeout(room.expiry)
  try {
    await room.handle.leave()
  } catch {
    /* already gone */
  }
  if (host.value?.code === cur.code) openHostRoom(cur.code)
}

/** Start (or keep) hosting a code. Called when the pairing UI becomes visible. */
export function startHosting(): void {
  if (host.value) return
  const code = generateCode()
  host.value = { code, expiresAt: Date.now() + CODE_TTL_MS, locked: false, password: '', deriving: false }
  L.info(`hosting code ${code} (expires in ${CODE_TTL_MS / 60000} min)`)
  openHostRoom(code)
}

/** Replace the code in place (expiry, too many wrong tries, or after a successful pairing). */
export function rotateCode(keepRoomForPeers = false): void {
  const cur = host.value
  if (!cur) return
  if (hostRoom) {
    if (keepRoomForPeers) retire(hostRoom)
    else {
      window.clearTimeout(hostRoom.expiry)
      void hostRoom.handle.leave()
    }
    hostRoom = null
  }
  const code = generateCode()
  L.info(`code ${cur.code} → ${code}${keepRoomForPeers ? ' (old room kept for its peer)' : ''}`)
  host.value = { ...cur, code, expiresAt: Date.now() + CODE_TTL_MS }
  hostKey = null
  hostKeyFor = ''
  if (cur.locked && cur.password.length >= PASSWORD_MIN) void ensureHostKey(cur.password, code)
  openHostRoom(code)
}

/** Stop advertising. Rooms with connected peers stay alive until those peers leave. */
export function stopHosting(): void {
  if (!host.value) return
  L.info(`stopped hosting code ${host.value.code}`)
  if (hostRoom) retire(hostRoom)
  hostRoom = null
  host.value = null
  hostKey = null
  hostKeyFor = ''
}

export function setHostLocked(locked: boolean): void {
  const cur = host.value
  if (!cur) return
  const password = locked && !cur.password ? suggestPassword() : cur.password
  host.value = { ...cur, locked, password }
  if (locked && password.length >= PASSWORD_MIN) void ensureHostKey(password, cur.code)
}

export function setHostPassword(password: string): void {
  const cur = host.value
  if (!cur) return
  host.value = { ...cur, password }
  window.clearTimeout(hostPasswordTimer)
  if (cur.locked && password.length >= PASSWORD_MIN) {
    hostPasswordTimer = window.setTimeout(() => void ensureHostKey(password, cur.code), 400)
  }
}

export function newHostPassword(): void {
  setHostPassword(suggestPassword())
}

// ---- Joiner ------------------------------------------------------------------------------------

export type JoinStep = 'finding' | 'password' | 'opening'

export interface JoinState {
  code: string
  startedAt: number
  step: JoinStep
  hostName: string | null
  locked: boolean
  passwordChecked: boolean
  /** KDF or round-trip in flight. */
  checking: boolean
  triesLeft: number | null
  wrong: boolean
  /** Files or text captured before pairing; the Send sheet opens for the new peer. */
  intent: boolean
}

export interface SorryState {
  code: string
  cause: NatKind
  reason: 'timeout' | 'auth' | 'rotated' | 'closed' | 'expired'
}

export const joining = signal<JoinState | null>(null)
export const sorry = signal<SorryState | null>(null)

interface JoinSession {
  code: string
  handle: RoomHandle | null
  link: PeerLink | null
  /** The link already served discovery; closing it would drop the device entirely. */
  sharedLink: boolean
  /** Channels open in the code room still waiting for a host message. */
  waiting: number
  timers: number[]
  password: ((pw: string) => void) | null
  done: boolean
  outcome: 'paired' | 'failed' | 'cancelled' | null
  onPaired: (peer: Peer) => void
}

let joinSession: JoinSession | null = null

function patchJoin(patch: Partial<JoinState>): void {
  const cur = joining.value
  if (cur) joining.value = { ...cur, ...patch }
}

function endJoin(session: JoinSession): void {
  session.done = true
  for (const t of session.timers) window.clearTimeout(t)
  if (joinSession === session) joinSession = null
  queueMicrotask(() => endJoinChecked(session))
}

function failJoin(session: JoinSession, reason: SorryState['reason']): void {
  if (session.done) return
  L.error(`join ${session.code} failed: ${reason}`, { nat: nat.value, elapsedMs: Date.now() - (joining.value?.startedAt ?? Date.now()) })
  session.outcome = 'failed'
  endJoin(session)
  if (!session.sharedLink) session.link?.close()
  void session.handle?.leave()
  joining.value = null
  sorry.value = { code: session.code, cause: nat.value === 'checking' ? 'unknown' : nat.value, reason }
}

async function joinerIntro(session: JoinSession, link: PeerLink, previous: Promise<unknown> | null): Promise<void> {
  await link.ready
  if (session.done) {
    if (!link.attachedTo) link.close()
    return
  }
  // Not necessarily the host: an earlier joiner stays in the code room to keep its connection, and
  // Trystero connects us to everyone there. Only a host message claims the session (and stops the join
  // timers, which keep running for the real host until then).
  session.waiting++
  L.info(`peer in the room for code ${session.code}, channel open`, { sharedWithDiscovery: !!link.attachedTo })
  patchJoin({ step: 'opening' })

  let first: ControlMessage
  try {
    if (previous) {
      L.debug(`code ${session.code}: connection is being introduced by another room; waiting`)
      await previous.catch(() => {})
      if (!link.open) throw new Error('closed')
    }
    first = await waitForControl(
      link,
      PEER_TIMEOUT_MS,
      (m) => m.type === 'auth-required' || m.type === 'code-expired' || (m.type === 'pair-open' && m.code === session.code),
    )
  } catch {
    session.waiting--
    if (!link.attachedTo) link.close()
    if (session.done || session.link) return
    if (session.waiting > 0) {
      L.warn(`a peer in the room for code ${session.code} went quiet; another is still answering`)
      return
    }
    L.warn(`a peer in the room for code ${session.code} went quiet; waiting ${PAIR_RETRY_MS / 1000} s more for the host`)
    session.timers.push(window.setTimeout(() => failJoin(session, 'closed'), PAIR_RETRY_MS))
    return
  }
  session.waiting--
  if (session.done || session.link) {
    if (!link.attachedTo) link.close()
    return
  }
  session.link = link
  session.sharedLink = !!link.attachedTo
  for (const t of session.timers) window.clearTimeout(t)
  session.timers = []
  L.info(`found host for code ${session.code}`, { sharedWithDiscovery: session.sharedLink })

  if (first.type === 'code-expired') {
    failJoin(session, 'expired')
    return
  }

  let passwordVerified = false

  if (first.type === 'auth-required') {
    const nH = typeof first.nH === 'string' ? fromB64url(first.nH) : null
    const fps = link.fingerprints()
    if (!nH || nH.length !== 16 || !fps) {
      failJoin(session, 'auth')
      return
    }
    L.info('host requires a password')
    patchJoin({ step: 'password', locked: true, hostName: typeof first.name === 'string' ? first.name : null })

    for (;;) {
      const pw = await new Promise<string>((resolve) => {
        session.password = resolve
      })
      if (session.done) return
      patchJoin({ checking: true, wrong: false })
      try {
        const k0 = Date.now()
        const key = await deriveAuthKeyInWorker(pw, session.code)
        L.debug(`password key derived in ${Date.now() - k0} ms`)
        const nJ = randomNonce()
        // fpH is theirs (remote), fpJ is ours (local).
        const mac = await authMac(key, 'J', nH, nJ, fps.remote, fps.local)
        const reply = waitForControl(link, PEER_TIMEOUT_MS, (m) => m.type === 'auth-ok' || m.type === 'auth-fail')
        link.sendControl({ type: 'auth-proof', nJ: b64url(nJ), mac: b64url(mac) })
        const res = await reply
        if (res.type === 'auth-fail') {
          const triesLeft = typeof res.triesLeft === 'number' ? res.triesLeft : null
          L.warn('password rejected by host', { triesLeft })
          patchJoin({ checking: false, wrong: true, triesLeft })
          if (triesLeft === 0) {
            failJoin(session, 'rotated')
            return
          }
          continue
        }
        const hostMac = typeof res.mac === 'string' ? fromB64url(res.mac) : null
        const ok = !!hostMac && (await verifyAuthMac(key, 'H', nH, nJ, fps.remote, fps.local, hostMac))
        if (!ok) {
          failJoin(session, 'auth')
          return
        }
        passwordVerified = true
        L.info('password accepted, host proof verified')
        patchJoin({ checking: false, passwordChecked: true, step: 'opening' })
        break
      } catch {
        failJoin(session, 'closed')
        return
      }
    }
  } else {
    // pair-open: answer with pair-join (repeated until the host's hello proves it was heard).
    L.info('host accepted the code, confirming')
  }

  try {
    const theirs = waitForControl(link, PEER_TIMEOUT_MS, isHello)
    if (!passwordVerified) sendUntil(link, { type: 'pair-join', code: session.code }, theirs)
    sendUntil(link, helloMessage(), theirs)
    const hello = (await theirs) as HelloMessage
    link.sendControl(helloMessage()) // one more copy now the host can hear it, as exchangeHello does
    const peer = await attachPeer(link, hello, { paired: true, passwordVerified })
    endJoin(session)
    session.outcome = 'paired'
    joining.value = null
    L.info(`paired with ${peer.name} via code ${session.code}`, { passwordVerified })
    toast(passwordVerified ? `Paired with ${peer.name} (password verified)` : `Paired with ${peer.name}`, 4500)
    flashPeer(peer.deviceId)
    // Bring the tile on screen; on a phone it can sit below the fold.
    window.setTimeout(() => {
      document.querySelector(`[data-peer="${peer.deviceId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 50)
    session.onPaired(peer)
  } catch (err) {
    L.error(`join ${session.code}: introduction threw`, err)
    failJoin(session, 'closed')
  }
}

/**
 * Safety net: the Connecting screen must never just vanish. If a session ends without a recorded
 * outcome, surface it as a failure so the user gets the Sorry screen rather than silence.
 */
function endJoinChecked(session: JoinSession): void {
  if (!session.done) return
  if (session.outcome === null) {
    L.error(`join ${session.code} ended with no outcome; treating as a failure`)
    sorry.value = { code: session.code, cause: nat.value === 'checking' ? 'unknown' : nat.value, reason: 'closed' }
    joining.value = null
  }
}

/** Join a code: used by typed codes, the scanner, the paste chip and pairing links. */
export function joinWithCode(code: string, opts: { intent?: boolean; onPaired: (peer: Peer) => void }): void {
  if (!isValidCode(code)) return
  if (joinSession) cancelJoin()
  sorry.value = null
  const session: JoinSession = {
    code,
    handle: null,
    link: null,
    sharedLink: false,
    waiting: 0,
    timers: [],
    password: null,
    done: false,
    outcome: null,
    onPaired: opts.onPaired,
  }
  joinSession = session
  L.info(`joining code ${code}`, { intent: !!opts.intent, nat: nat.value })
  joining.value = {
    code,
    startedAt: Date.now(),
    step: 'finding',
    hostName: null,
    locked: false,
    passwordChecked: false,
    checking: false,
    triesLeft: null,
    wrong: false,
    intent: !!opts.intent,
  }

  void roomId('code', code).then((id) => {
    if (session.done) return
    session.handle = trysteroSignaling.join(id, {
      onPeer(_peerId, pc) {
        const link = createPeerLink(pc)
        runIntroduction(link, (previous) => joinerIntro(session, link, previous)).catch(() => {
          if (!link.attachedTo) link.close()
        })
      },
      onPeerLeave() {},
      onError() {
        // Trystero also reports this for a peer it then reaches through another room (one connection
        // serves every room), so give a channel a moment to open before giving up.
        if (session.done || session.link || session.waiting > 0) return
        session.timers.push(
          window.setTimeout(() => {
            if (!session.link && session.waiting === 0) failJoin(session, 'timeout')
          }, JOIN_ERROR_GRACE_MS),
        )
      },
    })
    session.timers.push(
      window.setTimeout(() => {
        if (session.done || session.link) return
        L.warn(`no host after ${PAIR_TIMEOUT_MS / 1000} s, restarting ICE and waiting ${PAIR_RETRY_MS / 1000} s more`)
        for (const pc of Object.values(session.handle?.peers() ?? {})) {
          try {
            pc.restartIce()
          } catch {
            /* not restartable */
          }
        }
        session.timers.push(window.setTimeout(() => failJoin(session, 'timeout'), PAIR_RETRY_MS))
      }, PAIR_TIMEOUT_MS),
    )
  })
}

export function submitJoinPassword(password: string): void {
  joinSession?.password?.(password)
}

export function cancelJoin(): void {
  const s = joinSession
  if (!s) return
  L.info(`join ${s.code} cancelled`)
  s.outcome = 'cancelled'
  endJoin(s)
  if (!s.sharedLink) s.link?.close()
  void s.handle?.leave()
  joining.value = null
}

export function dismissSorry(): void {
  sorry.value = null
}
