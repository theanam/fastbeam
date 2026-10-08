import { inertType, sanitizeFileName, sanitizeRelPath, type FileMeta } from '../protocol'
import type { SavedFile, Sink } from './types'

// Minimal typings for the File System Access API (Chromium desktop).
interface WritableLike {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}
interface FileHandleLike {
  name: string
  createWritable(): Promise<WritableLike>
  getFile(): Promise<File>
}
interface DirHandleLike {
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandleLike>
}
interface PickerWindow {
  showSaveFilePicker?: (opts?: { suggestedName?: string }) => Promise<FileHandleLike>
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<DirHandleLike>
}

export function fsAccessSupported(): boolean {
  const w = window as unknown as PickerWindow
  return typeof w.showSaveFilePicker === 'function' && typeof w.showDirectoryPicker === 'function'
}

export class FsAccessSink implements Sink {
  readonly kind = 'fs' as const
  readonly destinationLabel = 'saved where you chose'
  private files: FileMeta[] = []
  private single: FileHandleLike | null = null
  private dir: DirHandleLike | null = null
  private handles: (FileHandleLike | null)[] = []
  private writable: WritableLike | null = null

  async prepare(files: FileMeta[]): Promise<void> {
    const w = window as unknown as PickerWindow
    this.files = files
    if (files.length === 1 && w.showSaveFilePicker) {
      this.single = await w.showSaveFilePicker({ suggestedName: sanitizeFileName(files[0]!.name) })
    } else if (w.showDirectoryPicker) {
      this.dir = await w.showDirectoryPicker({ mode: 'readwrite' })
    } else {
      throw new Error('File System Access unavailable')
    }
  }

  private async handleFor(index: number): Promise<FileHandleLike> {
    if (this.single) return this.single
    if (!this.dir) throw new Error('no directory')
    const meta = this.files[index]!
    let dir = this.dir
    for (const seg of sanitizeRelPath(meta.relPath)) dir = await dir.getDirectoryHandle(seg, { create: true })
    const base = sanitizeFileName(meta.name)
    // Avoid clobbering an existing file: name (2).ext, name (3).ext, …
    let name = base
    for (let n = 2; n < 100; n++) {
      try {
        await dir.getFileHandle(name, { create: false })
      } catch {
        break
      }
      const dot = base.lastIndexOf('.')
      name = dot > 0 ? `${base.slice(0, dot)} (${n})${base.slice(dot)}` : `${base} (${n})`
    }
    return dir.getFileHandle(name, { create: true })
  }

  async startFile(index: number): Promise<void> {
    const h = await this.handleFor(index)
    this.handles[index] = h
    this.writable = await h.createWritable()
  }

  async write(_index: number, data: Uint8Array): Promise<void> {
    await this.writable?.write(data as BufferSource)
  }

  async endFile(_index: number): Promise<void> {
    await this.writable?.close()
    this.writable = null
  }

  async finish(): Promise<SavedFile[]> {
    return this.files.map((f, i) => {
      const h = this.handles[i]
      const saved: SavedFile = { name: sanitizeFileName(f.name), size: f.size, type: f.mime }
      if (h) {
        // Force the vetted type: getFile() would infer one from the peer-chosen name (e.g. .html).
        const type = inertType(f.mime)
        if (type) {
          saved.open = async () => {
            const file = await h.getFile()
            const url = URL.createObjectURL(file.slice(0, file.size, type))
            window.open(url, '_blank', 'noopener')
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
          }
        }
        saved.blob = () => h.getFile()
      }
      return saved
    })
  }

  async abort(): Promise<void> {
    try {
      await this.writable?.abort()
    } catch {
      /* already closed */
    }
    this.writable = null
  }
}
