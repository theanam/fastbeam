import { openViewer } from '../../state/media'
import { getPeer } from '../../state/peers'
import { openSendSheet } from '../../state/ui'
import { clearIncoming, clearOutgoing, incoming, outgoing } from '../../transfer/manager'
import { formatBytes, formatDuration } from '../../transfer/protocol'
import { AutoAcceptRow } from '../components/AutoAcceptRow'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { CheckIcon, CloseIcon, ImageIcon } from '../components/Icons'
import { Thumb } from '../components/Thumb'
import { galleryFrom } from './transferView'
import { cardList, cx, rowSub, rowText, screen, screenHead } from '../classes'

/** File card; its View/Open/Save links get a 44px target with 14px padding and 15px text. */
const doneItem = cx(
  'flex min-h-15 items-center gap-3 rounded-2xl border border-line bg-surface pr-1.5 pl-4',
  '[&>button:not(:first-child)]:px-3.5 [&>button:not(:first-child)]:text-15',
)
const doneCheck = cx(
  'inline-flex size-30 items-center justify-center rounded-full bg-accent text-on-button',
  'shadow-[0_0_0_14px_var(--color-tint)] motion-safe:animate-[fb-pop_0.5s_ease-out_both]',
)
const thumbBtn = 'group/thumb inline-flex flex-none rounded-[10px] leading-[0]'

/** Screen 6, both directions. */
export function Done() {
  const o = outgoing.value?.snap.value
  const i = incoming.value?.snap.value
  const isSend = !!o && o.state === 'done'
  const snap = isSend ? o : i
  if (!snap || snap.state !== 'done') return null
  const count = snap.files.length
  const dur = snap.startedAt && snap.finishedAt ? formatDuration(snap.finishedAt - snap.startedAt) : null
  const peer = getPeer(snap.peerId)
  const close = () => (isSend ? clearOutgoing() : clearIncoming())
  const again = () => {
    close()
    if (peer) openSendSheet(peer.deviceId)
  }
  const saved = !isSend && i ? i.saved : []
  const dest = !isSend && i ? i.destinationLabel : ''
  const gallery = galleryFrom(saved)
  const galleryItems = [...gallery.values()]
  const viewAt = (fileIdx: number) => {
    const item = gallery.get(fileIdx)
    if (item) openViewer(galleryItems, galleryItems.indexOf(item))
  }

  return (
    <div class={screen}>
      <header class={screenHead}>
        <span class="text-15 font-semibold text-muted">
          {isSend ? 'To ' : 'From '}
          <span class="text-ink">{snap.peerName}</span>
        </span>
        <IconButton label="Close" round onClick={close}>
          <CloseIcon />
        </IconButton>
      </header>
      <div class="flex flex-col items-center gap-4.5 pt-6 text-center">
        <span class={doneCheck}>
          <CheckIcon size={56} strokeWidth={2.4} />
        </span>
        <div>
          <h1 class="mb-1.5 font-display text-34 font-extrabold tracking-display wrap-anywhere">
            {isSend ? 'Sent' : 'Got'} {count === 1 ? snap.files[0]?.name ?? '1 file' : `${count} files`}
          </h1>
          <div class="text-muted">
            {formatBytes(snap.totalSize)}
            {dur ? ` in ${dur}` : ''}
            {dest ? ` · ${dest}` : ''}
          </div>
        </div>
      </div>
      {galleryItems.length > 1 && (
        <Button variant="secondary" size="md" onClick={() => openViewer(galleryItems, 0)}>
          <ImageIcon /> View all {galleryItems.length} {galleryItems.every((g) => g.kind === 'image') ? 'photos' : 'photos and videos'}
        </Button>
      )}
      <div class="flex flex-1 flex-col gap-2">
        {snap.files.map((f, idx) => {
          const sv = saved[idx]
          const media = gallery.get(idx)
          return (
            <div key={f.fileId} class={doneItem}>
              {media && (
                <button type="button" class={thumbBtn} aria-label={`View ${f.name}`} onClick={() => viewAt(idx)}>
                  <Thumb item={media} size={44} />
                </button>
              )}
              <span class={rowText}>
                <span class="truncate text-16 font-semibold">{f.name}</span>
                <span class={rowSub}>{formatBytes(f.size)}</span>
              </span>
              {media && (
                <Button variant="link" size="md" onClick={() => viewAt(idx)}>
                  View
                </Button>
              )}
              {!media && sv?.open && (
                <Button variant="link" size="md" onClick={() => void sv.open?.()}>
                  Open
                </Button>
              )}
              {sv?.save && (
                <Button variant="link" size="md" onClick={() => sv.save?.()}>
                  Save
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {!isSend && (
        <div class={cx(cardList, 'empty:hidden')}>
          <AutoAcceptRow peerId={snap.peerId} />
        </div>
      )}
      <div class="mt-auto grid w-full grid-cols-2 gap-2.5">
        <Button variant="secondary" size="lg" disabled={!peer} onClick={again}>
          {isSend ? 'Send more' : 'Send back'}
        </Button>
        <Button variant="primary" size="lg" onClick={close}>
          Done
        </Button>
      </div>
    </div>
  )
}
