import { useEffect, useState } from 'preact/hooks'
import { type ViewerItem } from '../../state/media'

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
        u = URL.createObjectURL(b)
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
