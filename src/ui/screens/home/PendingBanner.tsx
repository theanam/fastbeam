import { clearPending, pendingFiles, pendingText } from '../../../state/ui'
import { IconButton } from '../../components/IconButton'
import { CloseIcon } from '../../components/Icons'

export function PendingBanner() {
  const files = pendingFiles.value
  const text = pendingText.value
  if (!files.length && !text) return null
  const what = files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'}` : 'Text'
  return (
    <div class="pending" role="status">
      <span>
        <strong>{what} ready.</strong> Tap a device to send {files.length ? 'them' : 'it'}.
      </span>
      <IconButton label="Clear" onClick={clearPending}>
        <CloseIcon size={18} />
      </IconButton>
    </div>
  )
}
