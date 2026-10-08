import { CHUNK_HEADER, TEXT_MAX } from '../config'
import { sha256 } from '../net/hash'
import type { ControlMessage } from '../net/peerLink'

export interface FileMeta {
  fileId: string
  name: string
  size: number
  mime: string
  relPath?: string
}

export interface OfferMessage extends ControlMessage {
  type: 'offer'
  transferId: string
  files?: FileMeta[]
  totalSize: number
  text?: string
}

export type DeclineReason = 'declined' | 'busy' | 'timeout'

export interface AcceptMessage extends ControlMessage {
  type: 'accept'
  transferId: string
  fileIds: string[]
}
export interface DeclineMessage extends ControlMessage {
  type: 'decline'
  transferId: string
  reason: DeclineReason
}
export interface FileStartMessage extends ControlMessage {
  type: 'file-start'
  transferId: string
  fileId: string
}
export interface FileEndMessage extends ControlMessage {
  type: 'file-end'
  transferId: string
  fileId: string
  bytes: number
}
export interface ProgressMessage extends ControlMessage {
  type: 'progress'
  transferId: string
  fileId: string
  bytesReceived: number
  totalReceived: number
}
export interface CancelMessage extends ControlMessage {
  type: 'cancel'
  transferId: string
  by: 'sender' | 'receiver'
}
export interface DoneMessage extends ControlMessage {
  type: 'done'
  transferId: string
}

export type TransferMessage =
  | OfferMessage
  | AcceptMessage
  | DeclineMessage
  | FileStartMessage
  | FileEndMessage
  | ProgressMessage
  | CancelMessage
  | DoneMessage

export const TRANSFER_TYPES = new Set(['offer', 'accept', 'decline', 'file-start', 'file-end', 'progress', 'cancel', 'done'])

export function isTransferMessage(msg: ControlMessage): msg is TransferMessage {
  return TRANSFER_TYPES.has(msg.type) && typeof msg.transferId === 'string'
}

function isFileMeta(f: unknown): f is FileMeta {
  if (typeof f !== 'object' || f === null) return false
  const m = f as Record<string, unknown>
  return (
    typeof m.fileId === 'string' &&
    typeof m.name === 'string' &&
    typeof m.mime === 'string' &&
    (m.relPath === undefined || typeof m.relPath === 'string') &&
    typeof m.size === 'number' &&
    m.size >= 0
  )
}

/** A peer's offer is either text or a non-empty file list (never both), with every field the receiver reads well-typed. */
export function isValidOffer(offer: OfferMessage): boolean {
  if (typeof offer.totalSize !== 'number') return false
  if (offer.text !== undefined) return offer.files === undefined && typeof offer.text === 'string' && offer.text.length <= TEXT_MAX
  return Array.isArray(offer.files) && offer.files.length > 0 && offer.files.every(isFileMeta)
}

/**
 * The type a received file may be opened as on our origin, or null if it must only be downloaded.
 * HTML, SVG, XML and the like would run script as fastbeam, so only types that cannot script pass.
 */
export function inertType(mime: string): string | null {
  const t = (mime.split(';')[0] ?? '').trim().toLowerCase()
  if (t === 'application/pdf') return t
  // Everything fastbeam sends was produced by a browser, so UTF-8 beats the viewer guessing a legacy encoding.
  if (t === 'text/plain') return 'text/plain;charset=utf-8'
  if (/^(audio|video)\/[\w.+-]+$/.test(t)) return t
  if (/^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(t)) return t
  return null
}

/** The same bytes under a type that cannot script on our origin: use this for every blob: URL of a received file. */
export function inertBlob(blob: Blob, mime: string): Blob {
  return blob.slice(0, blob.size, inertType(mime) ?? 'application/octet-stream')
}

const FRAME_FILE = 0x01

/** 5-byte header (frame type, uint32 file index) followed by the payload. */
export function encodeChunk(fileIndex: number, data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(CHUNK_HEADER + data.byteLength)
  const view = new DataView(buf)
  view.setUint8(0, FRAME_FILE)
  view.setUint32(1, fileIndex, false)
  new Uint8Array(buf, CHUNK_HEADER).set(data)
  return buf
}

export function decodeChunk(frame: ArrayBuffer): { fileIndex: number; data: Uint8Array } | null {
  if (frame.byteLength < CHUNK_HEADER) return null
  const view = new DataView(frame)
  if (view.getUint8(0) !== FRAME_FILE) return null
  return { fileIndex: view.getUint32(1, false), data: new Uint8Array(frame, CHUNK_HEADER) }
}

/** Strip path separators, control characters and leading dots; never let a name be empty. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const clean = base
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 180)
  return clean || 'file'
}

export function sanitizeRelPath(relPath: string | undefined): string[] {
  if (!relPath) return []
  return relPath
    .split(/[\\/]/)
    .slice(0, -1)
    .map((seg) => seg.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/^\.+/, '').trim())
    .filter((seg) => seg && seg !== '.' && seg !== '..')
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0 B'
  if (n < 1000) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1000
  let i = 0
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000
    i++
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 1
  return `${v.toFixed(digits)} ${units[i]}`
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${r} s` : `${m} min`
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '…'
  if (seconds < 5) return '~5 s'
  if (seconds < 60) return `~${Math.round(seconds)} s`
  const m = Math.round(seconds / 60)
  if (m < 60) return `~${m} min`
  const h = Math.floor(m / 60)
  return `~${h} h ${m % 60} min`
}

/** SHA-256 over the two DTLS fingerprints in sorted order; first six digits, shown as "482 019". */
export async function verificationCode(fpA: string, fpB: string): Promise<string> {
  const [a, b] = [fpA.toUpperCase(), fpB.toUpperCase()].sort()
  const digest = await sha256(`${a}|${b}`)
  const n = ((digest[0] ?? 0) << 24) >>> 0
  const value = (n + ((digest[1] ?? 0) << 16) + ((digest[2] ?? 0) << 8) + (digest[3] ?? 0)) % 1_000_000
  const six = value.toString().padStart(6, '0')
  return `${six.slice(0, 3)} ${six.slice(3)}`
}

/** If a snippet is exactly one http(s) URL, return it. */
export function singleUrl(text: string): string | null {
  const t = text.trim()
  if (/\s/.test(t)) return null
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

export function newId(): string {
  return crypto.randomUUID()
}
