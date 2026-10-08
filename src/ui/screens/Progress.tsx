import { useEffect, useState } from 'preact/hooks'
import { formatBytes, formatEta } from '../../transfer/protocol'
import { Button } from '../components/Button'
import { ShieldPlainIcon } from '../components/Icons'
import { Row, currentView, formatElapsed } from './transferView'
import { card, cx, dotLive, mono, rowSub, screen, screenHead } from '../classes'

const stat = 'flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3'
const statValue = cx(mono, 'truncate text-17')

const R = 104

const CIRC = 2 * Math.PI * R

/** Screen 5. The file list is a polite live region refreshed at most once per second. */
export function Progress() {
  const v = currentView()
  const [liveRows, setLiveRows] = useState<Row[]>(v?.rows ?? [])
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => {
      const cur = currentView()
      if (cur) setLiveRows(cur.rows)
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(t)
  }, [])
  if (!v) return null
  const since = v.startedAt ?? v.offeredAt
  const elapsed = since ? formatElapsed(now - since) : '0:00'
  const pct = v.total > 0 ? Math.min(100, Math.floor((v.done / v.total) * 100)) : 0
  const dash = (pct / 100) * CIRC
  const waiting = v.phase === 'waiting'
  const starting = v.phase === 'starting'
  const statusLine = waiting
    ? `Waiting for ${v.peerName} to accept…`
    : starting
      ? v.kind === 'send'
        ? `${v.peerName} accepted. Setting up the transfer…`
        : 'Setting up the transfer…'
      : v.finishing
        ? `Everything is sent. Waiting for ${v.peerName} to finish writing it to disk…`
        : null
  return (
    <div class={screen}>
      <header class={screenHead}>
        <span class="text-15 font-semibold text-muted">
          {v.kind === 'send' ? 'Sending to ' : 'Receiving from '}
          <span class="text-ink">{v.peerName}</span>
        </span>
        <span class="inline-flex items-center gap-1.5 text-13 font-semibold text-link">
          <ShieldPlainIcon /> Direct · encrypted
        </span>
      </header>

      <div
        class="relative size-60 self-center"
        role="progressbar"
        aria-valuenow={waiting || starting ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={waiting ? 'Waiting for the other device to accept' : starting ? 'Setting up' : `${pct} percent`}
        aria-label="Overall progress"
      >
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          aria-hidden="true"
          class={cx(
            '[transform:rotate(-90deg)]',
            (waiting || starting) && 'motion-safe:animate-[fb-ring-spin_1.4s_linear_infinite]',
          )}
        >
          <circle cx="120" cy="120" r={R} class="fill-none stroke-tint [stroke-width:14]" />
          <circle
            cx="120"
            cy="120"
            r={R}
            class={cx(
              'fill-none stroke-accent [stroke-linecap:round] [stroke-width:14]',
              !(waiting || starting) && 'transition-[stroke-dasharray] duration-200 ease-linear',
            )}
            stroke-dasharray={waiting || starting ? `${CIRC * 0.18} ${CIRC}` : `${dash} ${CIRC}`} />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {waiting || starting ? (
            <>
              <div class="font-display text-34 leading-[1.1] font-extrabold tracking-display">
                {waiting ? 'Waiting' : 'Starting'}
              </div>
              <div class="text-muted">
                {v.rows.length === 0 ? 'text' : `${v.rows.length} ${v.rows.length === 1 ? 'file' : 'files'}`} · {formatBytes(v.total)}
              </div>
            </>
          ) : (
            <>
              <div class="font-display text-[64px] leading-none font-extrabold tracking-[-0.04em]">
                {pct}
                <span class="text-32">%</span>
              </div>
              <div class="text-muted">
                {formatBytes(v.done)} of {formatBytes(v.total)}
              </div>
            </>
          )}
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5">
        <div class={stat}>
          <div class={rowSub}>Speed</div>
          <div class={statValue}>{v.speed > 0 ? `${formatBytes(v.speed)}/s` : '—'}</div>
        </div>
        <div class={stat}>
          <div class={rowSub}>Elapsed</div>
          <div class={statValue}>{elapsed}</div>
        </div>
        <div class={stat}>
          <div class={rowSub}>Time left</div>
          <div class={statValue}>{v.finishing ? 'finishing' : v.eta !== null ? formatEta(v.eta) : '—'}</div>
        </div>
      </div>
      {statusLine && (
        <div class="flex items-center justify-center gap-2 text-center text-14 text-body" role="status">
          <span class={dotLive} aria-hidden="true" />
          {statusLine}
        </div>
      )}

      <div class={cx(card, 'flex flex-1 flex-col overflow-y-auto px-4 py-1.5 empty:hidden')} aria-live="polite">
        {liveRows.map((r) => {
          const p = r.size > 0 ? Math.min(100, Math.floor((r.done / r.size) * 100)) : r.complete ? 100 : 0
          const rowWaiting = r.done === 0 && !r.complete
          return (
            <div key={r.key} class="flex flex-col gap-2 border-b border-line-soft py-3 last:border-b-0">
              <div class="flex justify-between gap-3 text-15">
                <span class={cx('min-w-0 truncate font-semibold', rowWaiting && 'text-muted')}>
                  {r.name}
                </span>
                <span class="text-muted">{r.complete ? 'Done' : rowWaiting ? (waiting ? 'Queued' : 'Waiting') : `${p}%`}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-[3px] bg-chip">
                <div
                  class="h-full rounded-[3px] bg-accent transition-[width] duration-200 ease-linear"
                  style={{ width: `${r.complete ? 100 : p}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div class="mt-auto flex flex-col gap-2.5">
        <div class={cx(rowSub, 'text-center')}>
          Keep this tab open until it finishes.
        </div>
        <Button variant="secondary" onClick={v.cancel}>
          {waiting ? 'Cancel request' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}
