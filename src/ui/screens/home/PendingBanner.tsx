import { clearPending, pendingFiles, pendingText } from '../../../state/ui'
import { IconButton } from '../../components/IconButton'
import { CloseIcon } from '../../components/Icons'

export function PendingBanner() {
  const files = pendingFiles.value
  const text = pendingText.value
  if (!files.length && !text) return null
  const what = files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'}` : 'Text'
  return (
    <div
      class="flex items-center gap-2 rounded-btn border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-tint py-1.5 pr-1.5 pl-4 text-15 text-link"
      role="status"
    >
      <span>
        <strong>{what} ready.</strong> Tap a device to send {files.length ? 'them' : 'it'}.
      </span>
      <IconButton label="Clear" onClick={clearPending}>
        <CloseIcon size={18} />
      </IconButton>
    </div>
  )
}
