import { useEffect, useRef, useState } from 'preact/hooks'
import { TEXT_MAX } from '../../config'
import { device } from '../../state/identity'
import { itemsFromFiles, mediaKind, openViewer } from '../../state/media'
import { Thumb } from '../components/MediaViewer'
import { getPeer, peerSubtitle, primaryLink } from '../../state/peers'
import { toast } from '../../state/toast'
import { closeSheet, pendingFiles, pendingText, type SendTab } from '../../state/ui'
import { startSend } from '../../transfer/manager'
import { formatBytes } from '../../transfer/protocol'
import { Button, IconButton } from '../components/Controls'
import { DeviceAvatar } from '../components/DeviceGlyph'
import { CloseIcon, FileIcon, FolderIcon, ImageIcon, VideoIcon } from '../components/Icons'
import { Sheet, Tabs } from '../components/Sheet'

const TABS = [
  { value: 'files', label: 'Files' },
  { value: 'text', label: 'Text or link' },
] as const

function fileIcon(f: File) {
  if (f.type.startsWith('image/')) return <ImageIcon />
  if (f.type.startsWith('video/')) return <VideoIcon />
  return <FileIcon />
}

/** Identity of a picked file. Includes the folder path: IMG.jpg in two subfolders is two files. */
function fileKey(f: File): string {
  return `${f.webkitRelativePath || f.name}:${f.size}:${f.lastModified}`
}

function dedupe(files: File[]): File[] {
  const seen = new Set<string>()
  return files.filter((f) => {
    const k = fileKey(f)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Screen 3. Opens aimed at one device; files brought in earlier are preselected. */
export function SendSheet({ peerId, tab: initialTab }: { peerId: string; tab: SendTab }) {
  const peer = getPeer(peerId)
  const [tab, setTab] = useState<SendTab>(initialTab)
  const [files, setFiles] = useState<File[]>(() => dedupe(pendingFiles.value))
  const [text, setText] = useState(() => pendingText.value ?? '')
  const mediaInput = useRef<HTMLInputElement>(null)
  const anyInput = useRef<HTMLInputElement>(null)
  const dirInput = useRef<HTMLInputElement>(null)

  // Consume the pending intent once it is in the sheet.
  useEffect(() => {
    if (pendingFiles.value.length) pendingFiles.value = []
    if (pendingText.value) pendingText.value = null
  }, [])

  // Anything pasted or dropped while the sheet is open lands in it.
  useEffect(() => {
    const more = pendingFiles.value
    if (more.length) {
      setFiles((cur) => dedupe([...cur, ...more]))
      pendingFiles.value = []
    }
    const t = pendingText.value
    if (t) {
      setText(t)
      setTab('text')
      pendingText.value = null
    }
  }, [pendingFiles.value, pendingText.value])

  useEffect(() => {
    if (!peer) closeSheet()
  }, [peer])

  if (!peer) return null
  const total = files.reduce((n, f) => n + f.size, 0)
  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((cur) => dedupe([...cur, ...Array.from(list)]))
  }

  const send = () => {
    const link = primaryLink(peer)
    if (!link || !link.open) {
      toast(`${peer.name} is not reachable right now`)
      return
    }
    if (tab === 'text') {
      const t = text.trim()
      if (!t) return
      if (startSend(peer, link, { text: t.slice(0, TEXT_MAX) })) closeSheet()
      return
    }
    if (!files.length) return
    if (startSend(peer, link, { files })) closeSheet()
  }

  const reachable = peer.online && peer.links.some((l) => l.open)
  const canSend = reachable && (tab === 'text' ? text.trim().length > 0 : files.length > 0)
  const sendLabel =
    tab === 'text'
      ? 'Send text'
      : files.length === 0
        ? 'Send'
        : `Send ${files.length} ${files.length === 1 ? 'file' : 'files'} · ${formatBytes(total)}`

  return (
    <Sheet label={`Send to ${peer.name}`} onClose={closeSheet}>
      <div class="sheet-head">
        <DeviceAvatar peer={peer} size={48} />
        <div class="sheet-head-text">
          <h2 class="sheet-title">Send to {peer.name}</h2>
          <div class="row-sub">
            {peerSubtitle(peer)} · {peer.paired ? 'Paired' : 'Nearby'}
          </div>
        </div>
        <IconButton label="Close" class="iconbtn--round" onClick={closeSheet}>
          <CloseIcon />
        </IconButton>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="What to send" />

      {tab === 'files' ? (
        <>
          <div class={`pickers${device.deviceType === 'desktop' ? ' pickers--3' : ''}`}>
            <button type="button" class="picker" onClick={() => mediaInput.current?.click()}>
              <ImageIcon /> Photos &amp; videos
            </button>
            <button type="button" class="picker" onClick={() => anyInput.current?.click()}>
              <FileIcon /> Files
            </button>
            {device.deviceType === 'desktop' && (
              <button type="button" class="picker" onClick={() => dirInput.current?.click()}>
                <FolderIcon /> Folder
              </button>
            )}
            <input ref={mediaInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => addFiles(e.currentTarget.files)} />
            <input ref={anyInput} type="file" multiple hidden onChange={(e) => addFiles(e.currentTarget.files)} />
            <input
              ref={dirInput}
              type="file"
              multiple
              hidden
              // @ts-expect-error non-standard but widely supported. Must be true: Preact sets the property, and "" is false.
              webkitdirectory
              onChange={(e) => addFiles(e.currentTarget.files)}
            />
          </div>

          <div class="selected">
            <div class="eyebrow-caps">Selected</div>
            {files.length === 0 ? (
              <div class="selected-empty muted">Nothing yet. Pick files above, drop them here, or paste.</div>
            ) : (
              <ul class="selected-list">
                {files.map((f, i) => (
                  <li key={fileKey(f)} class="selected-item">
                    {mediaKind(f.type, f.name) ? (
                      <button
                        type="button"
                        class="thumb-btn"
                        aria-label={`Preview ${f.name}`}
                        onClick={() => {
                          const items = itemsFromFiles(files)
                          openViewer(items, Math.max(0, items.findIndex((it) => it.name === f.name && it.size === f.size)))
                        }}
                      >
                        <Thumb item={itemsFromFiles([f])[0]!} size={40} />
                      </button>
                    ) : (
                      <span class="selected-icon">{fileIcon(f)}</span>
                    )}
                    <span class="selected-text">
                      <span class="selected-name">{f.name}</span>
                      <span class="row-sub">{formatBytes(f.size)}</span>
                    </span>
                    <IconButton label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>
                      <CloseIcon size={18} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div class="textsend">
          <label class="visually-hidden" for="send-text">
            Text or link
          </label>
          <textarea
            id="send-text"
            class="textarea"
            placeholder="Type or paste text, or a link"
            value={text}
            maxLength={TEXT_MAX}
            onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)}
          />
          <div class="row-sub" style={{ textAlign: 'right' }}>
            {text.length.toLocaleString()} / {TEXT_MAX.toLocaleString()}
          </div>
        </div>
      )}

      {!reachable && (
        <div class="alert alert--warn" role="status">
          Reconnecting to {peer.name}… Your selection stays here; Send comes back as soon as the link does.
        </div>
      )}
      <Button variant="primary" class="btn--lg" disabled={!canSend} onClick={send}>
        {sendLabel}
      </Button>
    </Sheet>
  )
}
