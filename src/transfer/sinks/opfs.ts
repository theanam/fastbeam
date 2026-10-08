import { logger } from '../../state/log'
import { inertBlob, sanitizeFileName, type FileMeta } from '../protocol'
import type { SavedFile, Sink } from './types'

const L = logger('sink')
const ACK_WINDOW = 8 * 1024 * 1024
const DIR = 'fastbeam-incoming'

let supported: boolean | null = null

/** Probe once at startup: OPFS plus synchronous access handles inside a worker. */
export async function probeOpfs(): Promise<boolean> {
  if (supported !== null) return supported
  if (typeof Worker === 'undefined' || !navigator.storage?.getDirectory) {
    supported = false
    return false
  }
  try {
    const w = new Worker(new URL('./opfs.worker.ts', import.meta.url), { type: 'module' })
    supported = await new Promise<boolean>((resolve) => {
      const t = window.setTimeout(() => resolve(false), 4000)
      w.onmessage = (e: MessageEvent<{ type: string }>) => {
        window.clearTimeout(t)
        resolve(e.data.type === 'ready')
      }
      w.onerror = () => {
        window.clearTimeout(t)
        resolve(false)
      }
      w.postMessage({ type: 'probe' })
    })
    w.terminate()
  } catch {
    supported = false
  }
  L.debug(`OPFS streaming ${supported ? 'available' : 'unavailable'}`)
  return supported
}

export function opfsSupported(): boolean {
  return supported === true
}

/** Remove leftovers from earlier sessions (files live only until the tab closes). */
export async function cleanupOpfs(): Promise<void> {
  try {
    const root = await navigator.storage?.getDirectory?.()
    if (!root) return
    await root.removeEntry(DIR, { recursive: true }).catch(() => {})
  } catch {
    /* nothing to clean */
  }
}

function triggerDownload(url: string, name: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  window.setTimeout(() => a.remove(), 1000)
}

/**
 * Receive into the Origin Private File System, then hand the user a disk-backed File to save.
 * Memory stays flat regardless of file size; the Save step streams from disk.
 */
export class OpfsSink implements Sink {
  readonly kind = 'opfs' as const
  readonly destinationLabel = 'ready to save'
  private files: FileMeta[] = []
  private worker: Worker | null = null
  private readonly id = crypto.randomUUID()
  private unacked = 0
  private waiters: (() => void)[] = []
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private results: (File | null)[] = []

  private request<T>(key: string, msg: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(key, { resolve: resolve as (v: unknown) => void, reject })
      this.worker!.postMessage(msg)
    })
  }

  async prepare(files: FileMeta[]): Promise<void> {
    if (!opfsSupported()) throw new Error('OPFS unavailable')
    this.files = files
    this.results = files.map(() => null)
    const w = new Worker(new URL('./opfs.worker.ts', import.meta.url), { type: 'module' })
    this.worker = w
    w.onmessage = (e: MessageEvent<{ type: string; index?: number; bytes?: number; message?: string }>) => {
      const m = e.data
      if (m.type === 'ack') {
        this.unacked -= m.bytes ?? 0
        if (this.unacked < ACK_WINDOW) {
          const ws = this.waiters.splice(0)
          for (const fn of ws) fn()
        }
        return
      }
      if (m.type === 'error') {
        L.error('OPFS worker error', m.message)
        for (const [, p] of this.pending) p.reject(new Error(m.message ?? 'OPFS error'))
        this.pending.clear()
        return
      }
      const key = m.type === 'opened' || m.type === 'closed' ? `${m.type}:${m.index}` : m.type
      const p = this.pending.get(key)
      if (p) {
        this.pending.delete(key)
        p.resolve(m)
      }
    }
    w.onerror = (ev) => L.error('OPFS worker crashed', ev.message)
    L.info('streaming to private storage, Save hands over a disk-backed file', { files: files.length })
  }

  private path(index: number): string {
    return `${this.id}-${index}`
  }

  async startFile(index: number): Promise<void> {
    await this.request(`opened:${index}`, { type: 'open', index, path: this.path(index) })
  }

  async write(index: number, data: Uint8Array): Promise<void> {
    const buf = data.slice().buffer
    this.unacked += buf.byteLength
    this.worker!.postMessage({ type: 'write', index, buf }, [buf])
    if (this.unacked >= ACK_WINDOW) await new Promise<void>((resolve) => this.waiters.push(resolve))
  }

  async endFile(index: number): Promise<void> {
    const res = await this.request<{ bytes: number }>(`closed:${index}`, { type: 'close', index })
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle(DIR)
    const fh = await dir.getFileHandle(this.path(index))
    const file = await fh.getFile()
    const meta = this.files[index]!
    // Re-wrap so the download carries the real name and type; the bytes stay on disk.
    this.results[index] = new File([file], sanitizeFileName(meta.name), { type: meta.mime || 'application/octet-stream' })
    L.debug(`stored ${meta.name} (${res.bytes} bytes) in private storage`)
  }

  async finish(): Promise<SavedFile[]> {
    this.worker?.terminate()
    this.worker = null
    return this.files.map((f, i) => {
      const file = this.results[i]
      const saved: SavedFile = { name: sanitizeFileName(f.name), size: f.size, type: f.mime }
      if (file) {
        saved.blob = async () => file
        saved.save = () => {
          // iOS may open this URL instead of downloading it, so it must not carry a type that can script.
          const url = URL.createObjectURL(inertBlob(file, f.mime))
          triggerDownload(url, saved.name)
          window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
        }
      }
      return saved
    })
  }

  async abort(): Promise<void> {
    if (this.worker) {
      try {
        await this.request('aborted', { type: 'abort' })
      } catch {
        /* worker gone */
      }
      this.worker.terminate()
      this.worker = null
    }
    this.results = []
  }
}
