import { useEffect, useRef } from 'preact/hooks'
import { getPeer } from '../../state/peers'
import { toast } from '../../state/toast'
import { openSendSheet, textReceived } from '../../state/ui'
import { singleUrl } from '../../transfer/protocol'
import { cx, rowSub } from '../classes'
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
    <dialog
      ref={ref}
      class={cx(
        'm-auto hidden w-[calc(100%-24px)] max-w-[460px] flex-col gap-3.5 rounded-3xl bg-surface text-ink open:flex',
        'pt-4 px-5 pb-5 backdrop:bg-[rgba(10,20,21,0.55)]',
      )}
      aria-label={`Text from ${t.from}`}
      onClose={close}
      onCancel={close}
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class={rowSub}>From</div>
          <div class="font-display text-22 font-bold tracking-title">{t.from}</div>
        </div>
        <IconButton label="Close" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>
      <pre class="max-h-[40dvh] overflow-auto rounded-2xl bg-ground px-4 py-3.5 font-ui text-15 leading-normal font-normal whitespace-pre-wrap wrap-anywhere">
        {t.text}
      </pre>
      <div class="flex flex-wrap gap-2.5">
        <Button variant="secondary" class="flex-1" onClick={copy}>
          <CopyIcon /> Copy
        </Button>
        {url && (
          <Button variant="primary" class="flex-1" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            <LinkIcon /> Open link
          </Button>
        )}
        {!url && getPeer(t.fromId) && (
          <Button
            variant="primary"
            class="flex-1"
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
