import { useEffect, useRef, useState } from 'preact/hooks'
import { lastProbe } from '../../net/discovery'
import { copyDiagnostics, diagnosticsHeader } from '../../state/diagnostics'
import { deviceId } from '../../state/identity'
import { clearLogs, consoleOpen, formatLogLine, logs, type LogLevel } from '../../state/log'
import { NAT_LABEL, nat } from '../../state/network'
import { peers } from '../../state/peers'
import { deviceName } from '../../state/settings'
import { toast } from '../../state/toast'
import { cx } from '../classes'
import { IconButton } from './IconButton'
import { CloseIcon } from './Icons'

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']
const RECENT = 80
const MIN_HEIGHT = 140
const HEIGHT_KEY = 'fastbeam:consoleHeight'

// The console is always dark, whatever the app theme, so its colours are fixed values.
const field =
  'h-[30px] rounded-lg border border-[#24393b] bg-[#122023] px-2 font-mono text-12 font-medium text-[#e4efee] ' +
  'focus:border-[#4dd0cc] focus:outline-0'
const btn =
  'h-[30px] rounded-lg border border-[#24393b] px-2.5 text-12 font-semibold hover:border-[#4dd0cc] ' +
  'hover:bg-[#16302f] aria-pressed:border-[#4dd0cc] aria-pressed:bg-[#16302f]'
/** On phones each line wraps as running text instead of a four-column grid. */
const cell = 'max-desk:mr-2 max-desk:inline'
const LVL_COLOR: Record<LogLevel, string> = {
  debug: 'text-[#93a9a8]',
  info: 'text-[#4dd0cc]',
  warn: 'text-[#ffd58a]',
  error: 'text-[#ff8a80]',
}
const MSG_COLOR: Record<LogLevel, string> = {
  debug: 'text-[#93a9a8]',
  info: 'text-[#e4efee]',
  warn: 'text-[#ffd58a]',
  error: 'text-[#ff8a80]',
}

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
    <section
      class={cx(
        'console fixed inset-x-0 bottom-0 z-25 flex h-[min(40vh,420px)] flex-col border-t border-[#24393b] bg-[#0a1415]',
        'text-[12.5px] text-[#c5d4d3] shadow-[0_-8px_32px_rgba(0,0,0,0.35)] max-desk:h-[72dvh] max-desk:text-12',
      )}
      aria-label="Status console"
      style={height !== null ? { height: `${height}px` } : undefined}
    >
      <div
        class={cx(
          'group/grip absolute inset-x-0 -top-[7px] z-1 flex h-3.5 cursor-ns-resize touch-none items-center',
          'justify-center focus-visible:outline-0',
        )}
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
        <span
          class={cx(
            'h-[5px] w-14 rounded-[3px] bg-[#24393b] transition-colors duration-120 ease-[ease]',
            'group-hover/grip:bg-[#4dd0cc] group-focus-visible/grip:bg-[#4dd0cc]',
          )}
        />
      </div>
      <header
        class={cx(
          'flex min-h-11 flex-none items-center gap-3.5 border-b border-[#24393b] pt-2.5 pr-2 pb-1.5 pl-3.5',
          'max-desk:flex-wrap max-desk:gap-2 max-desk:py-2 max-desk:pl-3',
        )}
      >
        <span class="font-mono text-12 font-bold tracking-[0.04em] whitespace-nowrap text-[#4dd0cc]">fastbeam console</span>
        <span class="min-w-0 flex-1 truncate font-mono text-12 font-medium text-[#93a9a8] max-desk:hidden">
          <b class="font-bold text-[#e4efee]">{deviceName.value}</b> · {deviceId.value.slice(0, 8)} · nat {NAT_LABEL[nat.value].toLowerCase()} · v4 {probe?.ipv4 ?? '–'} · v6/64{' '}
          {probe?.ipv6Prefix ?? '–'} · peers {peerList.length} ({peerList.filter((p) => p.online).length} online)
          {errors > 0 && <span class="font-bold text-[#ff8a80]"> · {errors} error{errors === 1 ? '' : 's'}</span>}
          {warns > 0 && <span class="text-[#ffd58a]"> · {warns} warning{warns === 1 ? '' : 's'}</span>}
        </span>
        <div class="flex flex-none items-center gap-1.5 max-desk:w-full max-desk:flex-wrap">
          <input
            class={cx(field, 'w-[150px] max-desk:min-w-[100px] max-desk:flex-1')}
            type="search"
            placeholder="filter"
            value={filter}
            aria-label="Filter log lines"
            onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)}
          />
          <select
            class={field}
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
          <button type="button" class={cx(btn, 'text-[#e4efee]')} aria-pressed={paused} onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" class={cx(btn, 'bg-[#16302f] text-[#4dd0cc]')} title={`Copy the last ${RECENT} lines with a device summary`} onClick={() => void copyDiagnostics(RECENT)}>
            Copy recent
          </button>
          <button type="button" class={cx(btn, 'text-[#e4efee]')} title="Copy every line currently shown" onClick={() => void copyShown()}>
            Copy all
          </button>
          <button type="button" class={cx(btn, 'text-[#e4efee]')} onClick={clearLogs}>
            Clear
          </button>
          <IconButton label="Close console" tone="inherit" class="size-9! text-[#e4efee]" onClick={() => (consoleOpen.value = false)}>
            <CloseIcon size={18} />
          </IconButton>
        </div>
      </header>
      <div ref={body} class="min-h-0 flex-1 overflow-auto pt-1.5 pb-2.5 font-mono leading-normal font-medium" role="log" aria-live="off">
        {shown.length === 0 ? (
          <div class="p-3.5 text-[#93a9a8]">Nothing yet{q ? ' for that filter' : ''}. Events show up here as they happen.</div>
        ) : (
          shown.map((e) => (
            <div
              key={e.id}
              class={cx(
                'grid grid-cols-[96px_44px_72px_1fr] gap-2.5 px-3.5 whitespace-pre-wrap wrap-anywhere hover:bg-[#0f1c1e]',
                'max-desk:block max-desk:border-b max-desk:border-[#122023] max-desk:px-3 max-desk:py-1',
              )}
            >
              <span class={cx(cell, 'text-[#6f8786]')}>{formatLogLine(e).slice(0, 12)}</span>
              <span class={cx(cell, 'self-baseline pt-0.5 text-[10.5px] tracking-[0.06em] uppercase', LVL_COLOR[e.level])}>
                {e.level}
              </span>
              <span class={cx(cell, 'text-[#93a9a8]')}>{e.scope}</span>
              <span class={cx('max-desk:inline', MSG_COLOR[e.level])}>
                {e.msg}
                {e.data && <span class="text-[#93a9a8]"> {e.data}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
