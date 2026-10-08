import { useEffect, useRef } from 'preact/hooks'
import { getPeer } from '../../state/peers'
import { toast } from '../../state/toast'
import { openSendSheet, textReceived } from '../../state/ui'
import { singleUrl } from '../../transfer/protocol'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { CloseIcon, CopyIcon, LinkIcon } from './Icons'

export function TextReceivedDialog() {
  const t = textReceived.value
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!t || !d) return
    if (!d.open) d.showModal()
    return () => {
      if (d.open) d.close()
    }
  }, [t])
  if (!t) return null
  const url = singleUrl(t.text)
  const close = () => (textReceived.value = null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.text)
      toast('Copied')
    } catch {
      toast('Couldn’t copy. Select the text instead.')
    }
  }
  return (
    <dialog ref={ref} class="textdlg" aria-label={`Text from ${t.from}`} onClose={close} onCancel={close}>
      <div class="textdlg-head">
        <div>
          <div class="row-sub">From</div>
          <div class="textdlg-title">{t.from}</div>
        </div>
        <IconButton label="Close" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>
      <pre class="textdlg-body">{t.text}</pre>
      <div class="textdlg-actions">
        <Button variant="secondary" onClick={copy}>
          <CopyIcon /> Copy
        </Button>
        {url && (
          <Button variant="primary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            <LinkIcon /> Open link
          </Button>
        )}
        {!url && getPeer(t.fromId) && (
          <Button
            variant="primary"
            onClick={() => {
              close()
              openSendSheet(t.fromId, 'text')
            }}
          >
            Reply
          </Button>
        )}
      </div>
    </dialog>
  )
}
