import { useEffect, useRef, useState } from 'preact/hooks'
import { closeViewer, viewer, type ViewerItem } from '../../state/media'
import { formatBytes } from '../../transfer/protocol'
import { cx } from '../classes'
import { IconButton } from './IconButton'
import { BackIcon, CloseIcon, DownloadIcon, ShareIcon } from './Icons'
import { Thumb } from './Thumb'

type Loaded = { url: string; blob: Blob } | { error: string }

/** Light icon buttons over the dark stage. */
const lightBtn = 'text-[#e4efee] hover:before:bg-[rgba(228,239,238,0.12)]!'
const note = 'max-w-[320px] p-6 text-center text-15 text-[#93a9a8]'
const media = 'block h-auto w-auto bg-[#000] object-contain'
const nav =
  'absolute top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full ' +
  'bg-[rgba(228,239,238,0.12)] text-[#e4efee] [@media(hover:none)]:hidden'

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
          cache.current.set(it, { url: URL.createObjectURL(blob), blob })
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
    if (!loaded || !('url' in loaded)) return
    const a = document.createElement('a')
    a.href = loaded.url
    a.download = item.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
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
      class={cx(
        'm-0 hidden h-dvh max-h-none w-screen max-w-none flex-col overflow-hidden open:flex',
        'bg-[#060d0e] text-[#e4efee] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        'backdrop:bg-[#060d0e]',
      )}
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
      <header class="flex flex-none items-center gap-2 px-2 py-1.5">
        <IconButton label="Close viewer" tone="inherit" class={lightBtn} onClick={closeViewer}>
          <CloseIcon />
        </IconButton>
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="truncate text-15 font-semibold">{item.name}</div>
          <div class="text-13 text-[#93a9a8]">
            {count > 1 ? `${index + 1} of ${count} · ` : ''}
            {formatBytes(item.size)}
          </div>
        </div>
        <div class="flex gap-0.5">
          {canShare() && (
            <IconButton label="Share" tone="inherit" class={lightBtn} onClick={() => void share()}>
              <ShareIcon size={20} />
            </IconButton>
          )}
          <IconButton label="Save" tone="inherit" class={lightBtn} disabled={!loaded || !('url' in loaded)} onClick={save}>
            <DownloadIcon size={22} />
          </IconButton>
        </div>
      </header>

      <div
        class={cx(
          'relative min-h-0 flex-1 select-none',
          zoom
            ? 'block touch-auto overflow-auto'
            : 'flex touch-pan-y touch-pinch-zoom items-center justify-center overflow-hidden',
        )}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {!loaded && <div class={note}>Loading…</div>}
        {loaded && 'error' in loaded && <div class={note}>{loaded.error}</div>}
        {loaded && 'url' in loaded && item.kind === 'image' && (
          <img
            key={loaded.url}
            class={cx(
              media,
              zoom ? 'mx-auto max-h-none max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in',
            )}
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
            class={cx(media, 'max-h-full max-w-full')}
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
            <button type="button" class={cx(nav, 'left-3')} aria-label="Previous" onClick={() => go(-1)}>
              <BackIcon />
            </button>
            <button type="button" class={cx(nav, 'right-3 rotate-180')} aria-label="Next" onClick={() => go(1)}>
              <BackIcon />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          class="flex flex-none gap-1.5 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="All media"
        >
          {items.map((it, i) => (
            <button
              key={`${it.name}:${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${it.name}, ${i + 1} of ${count}`}
              class={cx(
                'flex-none rounded-[10px] border-2 leading-[0]',
                i === index ? 'border-[#4dd0cc] opacity-100' : 'border-transparent opacity-60',
              )}
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
