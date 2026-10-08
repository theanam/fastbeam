import { useEffect, useState } from 'preact/hooks'
import { type ViewerItem } from '../../state/media'
import { cx } from '../classes'

/** A wrapping button with `group/thumb` brightens the thumbnail on hover. */
const base = 'block rounded-[10px] group-hover/thumb:brightness-105'
const full = cx(base, 'bg-chip object-cover')

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
  if (!url || failed) return <span class={cx(base, 'bg-tint')} style={style} aria-hidden="true" />
  if (item.kind === 'video') return (
      <video class={full} style={style} src={url} muted playsInline preload="metadata" aria-hidden="true" />
    )
  return <img class={full} style={style} src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
}
