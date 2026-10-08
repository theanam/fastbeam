import { signal } from '@preact/signals'

export type MediaKind = 'image' | 'video'

export interface ViewerItem {
  name: string
  size: number
  type: string
  kind: MediaKind
  /** Resolve the bytes on demand so the gallery never holds everything at once. */
  blob: () => Promise<Blob>
}

export const viewer = signal<{ items: ViewerItem[]; index: number } | null>(null)

// No svg: it can script, so it is never previewed on our origin (see inertType).
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv|3gp)$/i

export function mediaKind(type: string, name: string): MediaKind | null {
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (IMAGE_EXT.test(name)) return 'image'
  if (VIDEO_EXT.test(name)) return 'video'
  return null
}

export function itemsFromFiles(files: File[]): ViewerItem[] {
  const items: ViewerItem[] = []
  for (const f of files) {
    const kind = mediaKind(f.type, f.name)
    if (kind) items.push({ name: f.name, size: f.size, type: f.type, kind, blob: async () => f })
  }
  return items
}

export function openViewer(items: ViewerItem[], index = 0): void {
  if (!items.length) return
  viewer.value = { items, index: Math.max(0, Math.min(index, items.length - 1)) }
}

export function closeViewer(): void {
  viewer.value = null
}
