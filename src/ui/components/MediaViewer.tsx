import { useEffect, useRef, useState } from 'preact/hooks'
import { closeViewer, viewer, type ViewerItem } from '../../state/media'
import { formatBytes, inertBlob } from '../../transfer/protocol'
import { IconButton } from './Controls'
import { BackIcon, CloseIcon, DownloadIcon, ShareIcon } from './Icons'

type Loaded = { url: string; blob: Blob } | { error: string }

/** Full-screen gallery for photos and videos: swipe or arrow keys, thumbnails, save and share. */
export function MediaViewer() {
  const v = viewer.value
  const dlg = useRef<HTMLDialogElement>(null)
  const cache = useRef(new Map<ViewerItem, Loaded>())
  const [, bump] = useState(0)
  const [index, setIndex] = useState(v?.index ?? 0)
  const [zoom, setZoom] = useState(false)
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null)

  // Open / close the native dialog with the signal.
  useEffect(() => {
    const d = dlg.current
    if (!v || !d) return
    setIndex(v.index)
    setZoom(false)
    if (!d.open) d.showModal()
    const c = cache.current
    return () => {
      if (d.open) d.close()
      for (const l of c.values()) if ('url' in l) URL.revokeObjectURL(l.url)
      c.clear()
    }
  }, [v])

  const items = v?.items ?? []
  const item = items[index]

  // Load the current item and its neighbours.
  useEffect(() => {
    if (!v) return
    let alive = true
    const want = [index, index + 1, index - 1].map((i) => items[i]).filter((x): x is ViewerItem => !!x)
    for (const it of want) {
      if (cache.current.has(it)) continue
      it.blob()
        .then((blob) => {
          if (!alive) return
          // Re-typed: the peer's type (maybe SVG or HTML) must never reach a blob: URL on our origin.
          cache.current.set(it, { url: URL.createObjectURL(inertBlob(blob, it.type)), blob })
          bump((n) => n + 1)
        })
        .catch(() => {
          if (!alive) return
          cache.current.set(it, { error: 'Couldn’t load this file' })
          bump((n) => n + 1)
        })
    }
    return () => {
      alive = false
    }
  }, [v, index])

  if (!v || !item) return null
  const loaded = cache.current.get(item)
  const count = items.length
  const go = (delta: number) => {
    setZoom(false)
    setIndex((i) => (i + delta + count) % count)
  }

  const save = () => {
    if (!loaded || !('blob' in loaded)) return
    // A fresh URL rather than loaded.url, because iOS may open the link instead of saving it.
    const url = URL.createObjectURL(inertBlob(loaded.blob, item.type))
    const a = document.createElement('a')
    a.href = url
    a.download = item.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const canShare = (): boolean => {
    if (!loaded || !('blob' in loaded) || typeof navigator.share !== 'function' || !navigator.canShare) return false
    try {
      return navigator.canShare({ files: [new File([loaded.blob], item.name, { type: item.type })] })
    } catch {
      return false
    }
  }
  const share = async () => {
    if (!loaded || !('blob' in loaded)) return
    try {
      await navigator.share({ files: [new File([loaded.blob], item.name, { type: item.type })], title: item.name })
    } catch {
      /* dismissed */
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (zoom) return
    swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || count < 2) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - s.t < 800) go(dx < 0 ? 1 : -1)
  }

  return (
    <dialog
      ref={dlg}
      class="viewer"
      aria-label={`Viewing ${item.name}, ${index + 1} of ${count}`}
      onCancel={(e) => {
        e.preventDefault()
        closeViewer()
      }}
      onClose={closeViewer}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        else if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <header class="viewer-head">
        <IconButton label="Close viewer" class="viewer-btn" onClick={closeViewer}>
          <CloseIcon />
        </IconButton>
        <div class="viewer-title">
          <div class="viewer-name">{item.name}</div>
          <div class="viewer-sub">
            {count > 1 ? `${index + 1} of ${count} · ` : ''}
            {formatBytes(item.size)}
          </div>
        </div>
        <div class="viewer-actions">
          {canShare() && (
            <IconButton label="Share" class="viewer-btn" onClick={() => void share()}>
              <ShareIcon size={20} />
            </IconButton>
          )}
          <IconButton label="Save" class="viewer-btn" disabled={!loaded || !('blob' in loaded)} onClick={save}>
            <DownloadIcon size={22} />
          </IconButton>
        </div>
      </header>

      <div
        class={`viewer-stage${zoom ? ' viewer-stage--zoom' : ''}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {!loaded && <div class="viewer-note">Loading…</div>}
        {loaded && 'error' in loaded && <div class="viewer-note">{loaded.error}</div>}
        {loaded && 'url' in loaded && item.kind === 'image' && (
          <img
            key={loaded.url}
            class="viewer-media"
            src={loaded.url}
            alt={item.name}
            draggable={false}
            onClick={() => setZoom((z) => !z)}
            onError={() => {
              cache.current.set(item, { error: 'This browser can’t show this image format. Save it to open it elsewhere.' })
              bump((n) => n + 1)
            }}
          />
        )}
        {loaded && 'url' in loaded && item.kind === 'video' && (
          <video
            key={loaded.url}
            class="viewer-media"
            src={loaded.url}
            controls
            playsInline
            autoPlay
            onError={() => {
              cache.current.set(item, { error: 'This browser can’t play this video format. Save it to open it elsewhere.' })
              bump((n) => n + 1)
            }}
          />
        )}
        {count > 1 && (
          <>
            <button type="button" class="viewer-nav viewer-nav--prev" aria-label="Previous" onClick={() => go(-1)}>
              <BackIcon />
            </button>
            <button type="button" class="viewer-nav viewer-nav--next" aria-label="Next" onClick={() => go(1)}>
              <BackIcon />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div class="viewer-strip" role="tablist" aria-label="All media">
          {items.map((it, i) => (
            <button
              key={`${it.name}:${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${it.name}, ${i + 1} of ${count}`}
              class={`viewer-thumb${i === index ? ' is-current' : ''}`}
              onClick={() => {
                setZoom(false)
                setIndex(i)
              }}
            >
              <Thumb item={it} />
            </button>
          ))}
        </div>
      )}
    </dialog>
  )
}

/** Small lazy thumbnail for a media item; used in the gallery strip, the Done list and the Send sheet. */
export function Thumb({ item, size = 48 }: { item: ViewerItem; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    let u: string | null = null
    item
      .blob()
      .then((b) => {
        if (!alive) return
        u = URL.createObjectURL(inertBlob(b, item.type))
        setUrl(u)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [item])
  const style = { width: size, height: size }
  if (!url || failed) return <span class="thumb thumb--empty" style={style} aria-hidden="true" />
  if (item.kind === 'video') return <video class="thumb" style={style} src={url} muted playsInline preload="metadata" aria-hidden="true" />
  return <img class="thumb" style={style} src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
}
