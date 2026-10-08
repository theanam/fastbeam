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
    <div class="screen">
      <header class="screen-head">
        <span class="muted" style={{ fontWeight: 600, fontSize: 15 }}>
          {isSend ? 'To ' : 'From '}
          <span class="ink">{snap.peerName}</span>
        </span>
        <IconButton label="Close" class="iconbtn--round" onClick={close}>
          <CloseIcon />
        </IconButton>
      </header>
      <div class="done-hero">
        <span class="done-check">
          <CheckIcon size={56} strokeWidth={2.4} />
        </span>
        <div>
          <h1 class="done-title">
            {isSend ? 'Sent' : 'Got'} {count === 1 ? snap.files[0]?.name ?? '1 file' : `${count} files`}
          </h1>
          <div class="muted">
            {formatBytes(snap.totalSize)}
            {dur ? ` in ${dur}` : ''}
            {dest ? ` · ${dest}` : ''}
          </div>
        </div>
      </div>
      {galleryItems.length > 1 && (
        <Button variant="secondary" class="btn--md" onClick={() => openViewer(galleryItems, 0)}>
          <ImageIcon /> View all {galleryItems.length} {galleryItems.every((g) => g.kind === 'image') ? 'photos' : 'photos and videos'}
        </Button>
      )}
      <div class="done-list">
        {snap.files.map((f, idx) => {
          const sv = saved[idx]
          const media = gallery.get(idx)
          return (
            <div key={f.fileId} class="done-item">
              {media && (
                <button type="button" class="thumb-btn" aria-label={`View ${f.name}`} onClick={() => viewAt(idx)}>
                  <Thumb item={media} size={44} />
                </button>
              )}
              <span class="selected-text">
                <span class="selected-name">{f.name}</span>
                <span class="row-sub">{formatBytes(f.size)}</span>
              </span>
              {media && (
                <Button variant="link" onClick={() => viewAt(idx)}>
                  View
                </Button>
              )}
              {!media && sv?.open && (
                <Button variant="link" onClick={() => void sv.open?.()}>
                  Open
                </Button>
              )}
              {sv?.save && (
                <Button variant="link" onClick={() => sv.save?.()}>
                  Save
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {!isSend && (
        <div class="card card--list">
          <AutoAcceptRow peerId={snap.peerId} />
        </div>
      )}
      <div class="two-up screen-cta">
        <Button variant="secondary" class="btn--lg" disabled={!peer} onClick={again}>
          {isSend ? 'Send more' : 'Send back'}
        </Button>
        <Button variant="primary" class="btn--lg" onClick={close}>
          Done
        </Button>
      </div>
    </div>
  )
}
