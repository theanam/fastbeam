import { inertBlob, sanitizeFileName, type FileMeta } from '../protocol'
import type { SavedFile, Sink } from './types'

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

/** Collect chunks in memory and download at the end. iOS Safari and anything without the other two. */
export class BlobSink implements Sink {
  readonly kind = 'blob' as const
  readonly destinationLabel = 'ready to save'
  private files: FileMeta[] = []
  private parts: Uint8Array[][] = []
  private urls: (string | null)[] = []
  private blobs: (Blob | null)[] = []

  async prepare(files: FileMeta[]): Promise<void> {
    this.files = files
    this.parts = files.map(() => [])
    this.urls = files.map(() => null)
    this.blobs = files.map(() => null)
  }

  async startFile(index: number): Promise<void> {
    this.parts[index] = []
  }

  async write(index: number, data: Uint8Array): Promise<void> {
    // Copy: the frame buffer is reused by the channel in some engines.
    this.parts[index]!.push(data.slice())
  }

  async endFile(index: number): Promise<void> {
    const meta = this.files[index]!
    const blob = new Blob(this.parts[index] as BlobPart[], { type: meta.mime || 'application/octet-stream' })
    this.parts[index] = []
    this.blobs[index] = blob
    // Some browsers (iOS) open this URL instead of downloading it, so it must not carry a type that can script.
    const url = URL.createObjectURL(inertBlob(blob, meta.mime))
    this.urls[index] = url
    // Best effort: browsers that require a gesture ignore this, and the Save button covers it.
    try {
      triggerDownload(url, sanitizeFileName(meta.name))
    } catch {
      /* user can still press Save */
    }
  }

  async finish(): Promise<SavedFile[]> {
    return this.files.map((f, i) => {
      const url = this.urls[i]
      const blob = this.blobs[i]
      const saved: SavedFile = { name: sanitizeFileName(f.name), size: f.size, type: f.mime }
      if (url) saved.save = () => triggerDownload(url, sanitizeFileName(f.name))
      if (blob) saved.blob = async () => blob
      return saved
    })
  }

  async abort(): Promise<void> {
    this.parts = []
    for (const u of this.urls) if (u) URL.revokeObjectURL(u)
    this.urls = []
  }
}
