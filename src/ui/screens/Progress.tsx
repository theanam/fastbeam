import { useEffect, useState } from 'preact/hooks'
import { formatBytes, formatEta } from '../../transfer/protocol'
import { Button } from '../components/Button'
import { ShieldPlainIcon } from '../components/Icons'
import { Row, currentView, formatElapsed } from './transferView'

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
    <div class="screen">
      <header class="screen-head">
        <span class="muted" style={{ fontWeight: 600, fontSize: 15 }}>
          {v.kind === 'send' ? 'Sending to ' : 'Receiving from '}
          <span class="ink">{v.peerName}</span>
        </span>
        <span class="secure">
          <ShieldPlainIcon /> Direct · encrypted
        </span>
      </header>

      <div
        class={`ring${waiting || starting ? ' ring--indeterminate' : ''}`}
        role="progressbar"
        aria-valuenow={waiting || starting ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={waiting ? 'Waiting for the other device to accept' : starting ? 'Setting up' : `${pct} percent`}
        aria-label="Overall progress"
      >
        <svg width="240" height="240" viewBox="0 0 240 240" aria-hidden="true">
          <circle cx="120" cy="120" r={R} class="ring-track" />
          <circle cx="120" cy="120" r={R} class="ring-fill" stroke-dasharray={waiting || starting ? `${CIRC * 0.18} ${CIRC}` : `${dash} ${CIRC}`} />
        </svg>
        <div class="ring-center">
          {waiting || starting ? (
            <>
              <div class="ring-wait display">{waiting ? 'Waiting' : 'Starting'}</div>
              <div class="muted">
                {v.rows.length === 0 ? 'text' : `${v.rows.length} ${v.rows.length === 1 ? 'file' : 'files'}`} · {formatBytes(v.total)}
              </div>
            </>
          ) : (
            <>
              <div class="ring-pct">
                {pct}
                <span>%</span>
              </div>
              <div class="muted">
                {formatBytes(v.done)} of {formatBytes(v.total)}
              </div>
            </>
          )}
        </div>
      </div>

      <div class="three-up">
        <div class="stat">
          <div class="row-sub">Speed</div>
          <div class="mono stat-value">{v.speed > 0 ? `${formatBytes(v.speed)}/s` : '—'}</div>
        </div>
        <div class="stat">
          <div class="row-sub">Elapsed</div>
          <div class="mono stat-value">{elapsed}</div>
        </div>
        <div class="stat">
          <div class="row-sub">Time left</div>
          <div class="mono stat-value">{v.finishing ? 'finishing' : v.eta !== null ? formatEta(v.eta) : '—'}</div>
        </div>
      </div>
      {statusLine && (
        <div class="status-line" role="status">
          <span class="dot-live" aria-hidden="true" />
          {statusLine}
        </div>
      )}

      <div class="card card--list filelist" aria-live="polite">
        {liveRows.map((r) => {
          const p = r.size > 0 ? Math.min(100, Math.floor((r.done / r.size) * 100)) : r.complete ? 100 : 0
          const rowWaiting = r.done === 0 && !r.complete
          return (
            <div key={r.key} class="filerow">
              <div class="filerow-head">
                <span class={rowWaiting ? 'muted' : ''} style={{ fontWeight: 600 }}>
                  {r.name}
                </span>
                <span class="muted">{r.complete ? 'Done' : rowWaiting ? (waiting ? 'Queued' : 'Waiting') : `${p}%`}</span>
              </div>
              <div class="bar">
                <div style={{ width: `${r.complete ? 100 : p}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div class="stack-10 screen-cta">
        <div class="row-sub" style={{ textAlign: 'center' }}>
          Keep this tab open until it finishes.
        </div>
        <Button variant="secondary" onClick={v.cancel}>
          {waiting ? 'Cancel request' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}
