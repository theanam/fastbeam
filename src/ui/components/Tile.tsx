import { useState } from 'preact/hooks'
import { PROTOCOL } from '../../config'
import { peerSubtitle, type Peer } from '../../state/peers'
import { cx } from '../classes'
import { DeviceAvatar } from './DeviceGlyph'
import { DownloadIcon, InfoIcon, LockIcon } from './Icons'

export function Tile({
  peer,
  onSelect,
  onInfo,
  onDrop,
}: {
  peer: Peer
  onSelect: (peer: Peer) => void
  onInfo: (peer: Peer) => void
  onDrop: (peer: Peer, files: File[]) => void
}) {
  const [over, setOver] = useState<number>(0)
  const outdated = peer.protocol !== PROTOCOL
  const away = !peer.online
  const label = `Send to ${peer.name}, ${peer.platform}, ${peer.browser}${peer.paired ? ', paired' : ''}${outdated ? ', update needed' : ''}${away ? ', reconnecting' : ''}`

  return (
    <div class="relative flex" data-peer={peer.deviceId}>
      <button
        type="button"
        class={cx(
          'group/tile relative flex min-h-[132px] min-w-0 flex-1 flex-col gap-3.5 rounded-tile bg-surface text-left text-inherit',
          'transition-[border-color,box-shadow,background-color,translate,scale] duration-200 ease-fb disabled:opacity-60',
          'desk:min-h-[164px] desk:gap-4.5',
          over
            ? 'border-2 border-accent bg-tint p-[15px] shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-accent)_14%,transparent)] desk:p-[19px]'
            : cx(
                'border border-line p-4 shadow-raised desk:p-5',
                'hover:enabled:-translate-y-0.5 hover:enabled:border-accent hover:enabled:shadow-soft active:enabled:scale-[0.98]',
                'motion-reduce:hover:enabled:translate-y-0 motion-reduce:active:enabled:scale-100',
                // While files are dragged over the window, every tile shows it can take them.
                'group-data-dragging/shell:border-dashed group-data-dragging/shell:border-accent',
              ),
          away && 'border-dashed shadow-none',
          peer.flash && 'motion-safe:animate-[fb-flash_1.2s_ease-out_2] motion-reduce:border-accent',
        )}
        aria-label={label}
        disabled={outdated || away}
        onClick={() => onSelect(peer)}
        onDragOver={(e) => {
          if (!e.dataTransfer?.types.includes('Files')) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setOver(Math.max(1, e.dataTransfer.items.length))
        }}
        onDragLeave={() => setOver(0)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(0)
          const files = Array.from(e.dataTransfer?.files ?? [])
          if (files.length) onDrop(peer, files)
        }}
      >
        {peer.paired && !over && (
          <span class="absolute top-3.5 right-3.5 inline-flex h-6 items-center gap-1 rounded-full bg-ink px-2 text-12 font-semibold text-ground">
            <LockIcon size={12} strokeWidth={2.4} />
            {peer.passwordVerified ? 'Paired · locked' : 'Paired'}
          </span>
        )}
        {over ? (
          <span class="inline-flex size-12 items-center justify-center rounded-[14px] bg-accent text-on-button desk:size-13">
            <DownloadIcon />
          </span>
        ) : (
          <DeviceAvatar
            peer={peer}
            size={48}
            class={cx(
              'rounded-[14px] transition-colors duration-160 ease-fb',
              away
                ? 'bg-chip text-muted'
                : 'bg-tint text-link group-hover/tile:group-enabled/tile:bg-button group-hover/tile:group-enabled/tile:text-on-button',
            )}
          />
        )}
        <span class="flex min-w-0 flex-col gap-0.5 pr-7">
          <span class="text-17 font-bold text-ink wrap-anywhere desk:text-18">{over ? `Drop to send ${over} ${over === 1 ? 'file' : 'files'}` : peer.name}</span>
          <span class="text-14 text-muted">{over ? `to ${peer.name} · ${peer.platform}` : peerSubtitle(peer)}</span>
          {!over && (outdated || away) && (
            <span class="mt-1 inline-flex items-center gap-1.5 text-13 font-semibold text-warn-ink before:size-[7px] before:rounded-full before:bg-current motion-safe:before:animate-[fb-dot_1.4s_ease-in-out_infinite]">
              {outdated ? 'Update needed' : 'Reconnecting…'}
            </span>
          )}
        </span>
      </button>
      {!over && (
        <button
          type="button"
          class="absolute right-1 bottom-1 inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-link focus-visible:bg-tint focus-visible:text-link"
          aria-label={`About ${peer.name}`} title="Device details" onClick={() => onInfo(peer)}>
          <InfoIcon />
        </button>
      )}
    </div>
  )
}
