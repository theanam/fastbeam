import { useEffect, useRef, useState } from 'preact/hooks'
import { lastProbe } from '../../net/discovery'
import { copyDiagnostics, diagnosticsHeader } from '../../state/diagnostics'
import { deviceId } from '../../state/identity'
import { clearLogs, consoleOpen, formatLogLine, logs, type LogLevel } from '../../state/log'
import { NAT_LABEL, nat } from '../../state/network'
import { peers } from '../../state/peers'
import { deviceName } from '../../state/settings'
import { toast } from '../../state/toast'
import { IconButton } from './IconButton'
import { CloseIcon } from './Icons'

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']
const RECENT = 80
const MIN_HEIGHT = 140
const HEIGHT_KEY = 'fastbeam:consoleHeight'

function readHeight(): number | null {
  try {
    const v = Number(localStorage.getItem(HEIGHT_KEY))
    return Number.isFinite(v) && v >= MIN_HEIGHT ? v : null
  } catch {
    return null
  }
}

function clampHeight(h: number): number {
  return Math.max(MIN_HEIGHT, Math.min(Math.round(window.innerHeight * 0.92), Math.round(h)))
}

/** Docked status console for the curious: every discovery, link, pairing and transfer event, live. */
export function Console() {
  const open = consoleOpen.value
  const [filter, setFilter] = useState('')
  const [minLevel, setMinLevel] = useState<LogLevel>('debug')
  const [paused, setPaused] = useState(false)
  const [height, setHeight] = useState<number | null>(readHeight)
  const body = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startH: number } | null>(null)

  const onGripDown = (e: PointerEvent) => {
    const panel = (e.currentTarget as HTMLElement).parentElement
    if (!panel) return
    drag.current = { startY: e.clientY, startH: panel.getBoundingClientRect().height }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onGripMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    // The panel is docked at the bottom, so dragging up makes it taller.
    setHeight(clampHeight(d.startH + (d.startY - e.clientY)))
  }
  const onGripUp = () => {
    if (!drag.current) return
    drag.current = null
    try {
      if (height !== null) localStorage.setItem(HEIGHT_KEY, String(height))
    } catch {
      /* fine without persistence */
    }
  }
  const resetHeight = () => {
    setHeight(null)
    try {
      localStorage.removeItem(HEIGHT_KEY)
    } catch {
      /* ignore */
    }
  }
  const nudge = (delta: number) => {
    const panel = document.querySelector<HTMLElement>('.console')
    const cur = panel?.getBoundingClientRect().height ?? 300
    const next = clampHeight(cur + delta)
    setHeight(next)
    try {
      localStorage.setItem(HEIGHT_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        consoleOpen.value = !consoleOpen.value
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const entries = logs.value
  useEffect(() => {
    if (!open || paused) return
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length, open, paused])

  // Reserve room under the page so buttons at the bottom stay reachable while the console is docked.
  useEffect(() => {
    const root = document.documentElement
    if (!open) {
      root.style.removeProperty('--console-h')
      return
    }
    const apply = () => {
      const h = document.querySelector<HTMLElement>('.console')?.getBoundingClientRect().height ?? 0
      root.style.setProperty('--console-h', `${Math.round(h)}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    const el = document.querySelector<HTMLElement>('.console')
    if (el) ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--console-h')
    }
  }, [open, height])

  if (!open) return null

  const threshold = LEVELS.indexOf(minLevel)
  const q = filter.trim().toLowerCase()
  const shown = entries.filter(
    (e) => LEVELS.indexOf(e.level) >= threshold && (!q || `${e.scope} ${e.msg} ${e.data ?? ''}`.toLowerCase().includes(q)),
  )
  const peerList = [...peers.value.values()]
  const probe = lastProbe.value
  const errors = entries.filter((e) => e.level === 'error').length
  const warns = entries.filter((e) => e.level === 'warn').length

  const copyShown = async () => {
    try {
      await navigator.clipboard.writeText([...diagnosticsHeader(), '', ...shown.map(formatLogLine)].join('\n'))
      toast(`Copied ${shown.length} lines`)
    } catch {
      toast('Couldn’t copy')
    }
  }

  return (
    <section class="console" aria-label="Status console" style={height !== null ? { height: `${height}px` } : undefined}>
      <div
        class="console-grip"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize console. Drag, or use the arrow keys."
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
        onDblClick={resetHeight}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') nudge(40)
          else if (e.key === 'ArrowDown') nudge(-40)
          else return
          e.preventDefault()
        }}
      >
        <span />
      </div>
      <header class="console-head">
        <span class="console-title mono">fastbeam console</span>
        <span class="console-status">
          <b>{deviceName.value}</b> · {deviceId.value.slice(0, 8)} · nat {NAT_LABEL[nat.value].toLowerCase()} · v4 {probe?.ipv4 ?? '–'} · v6/64{' '}
          {probe?.ipv6Prefix ?? '–'} · peers {peerList.length} ({peerList.filter((p) => p.online).length} online)
          {errors > 0 && <span class="console-count console-count--err"> · {errors} error{errors === 1 ? '' : 's'}</span>}
          {warns > 0 && <span class="console-count console-count--warn"> · {warns} warning{warns === 1 ? '' : 's'}</span>}
        </span>
        <div class="console-tools">
          <input
            class="console-filter mono"
            type="search"
            placeholder="filter"
            value={filter}
            aria-label="Filter log lines"
            onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)}
          />
          <select
            class="console-select mono"
            aria-label="Minimum level"
            value={minLevel}
            onChange={(e) => setMinLevel((e.currentTarget as HTMLSelectElement).value as LogLevel)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}+
              </option>
            ))}
          </select>
          <button type="button" class="console-btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" class="console-btn console-btn--accent" title={`Copy the last ${RECENT} lines with a device summary`} onClick={() => void copyDiagnostics(RECENT)}>
            Copy recent
          </button>
          <button type="button" class="console-btn" title="Copy every line currently shown" onClick={() => void copyShown()}>
            Copy all
          </button>
          <button type="button" class="console-btn" onClick={clearLogs}>
            Clear
          </button>
          <IconButton label="Close console" class="console-close" onClick={() => (consoleOpen.value = false)}>
            <CloseIcon size={18} />
          </IconButton>
        </div>
      </header>
      <div ref={body} class="console-body mono" role="log" aria-live="off">
        {shown.length === 0 ? (
          <div class="console-empty">Nothing yet{q ? ' for that filter' : ''}. Events show up here as they happen.</div>
        ) : (
          shown.map((e) => (
            <div key={e.id} class={`console-line is-${e.level}`}>
              <span class="console-t">{formatLogLine(e).slice(0, 12)}</span>
              <span class="console-lvl">{e.level}</span>
              <span class="console-scope">{e.scope}</span>
              <span class="console-msg">
                {e.msg}
                {e.data && <span class="console-data"> {e.data}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
