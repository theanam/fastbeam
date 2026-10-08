import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { REPO_URL } from '../../config'
import { consoleOpen } from '../../state/log'
import { NAT_DETAIL, nat } from '../../state/network'
import { goBack, navigate, screen } from '../../state/router'
import { NetworkBadge } from './Header'
import { GithubIcon, Mark, SlidersIcon, TerminalIcon, Wordmark, WifiIcon } from './Icons'

const WIDE = '(min-width: 900px)'

export function useIsDesktop(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/** Desktop navigation rail: the same destinations as the phone header, with labels. */
function Sidebar() {
  const here = screen.value
  return (
    <nav class="sidebar" aria-label="fastbeam">
      <div class="brand sidebar-brand">
        <Mark class="brand-mark" />
        <Wordmark />
      </div>

      <div class="sidebar-nav">
        <button
          type="button"
          class="navitem"
          aria-current={here === 'home' ? 'page' : undefined}
          onClick={() => here !== 'home' && goBack()}
        >
          <WifiIcon />
          <span class="navitem-label">Nearby</span>
        </button>
        <button
          type="button"
          class="navitem"
          aria-current={here === 'settings' ? 'page' : undefined}
          onClick={() => navigate('settings')}
        >
          <SlidersIcon />
          <span class="navitem-label">Settings</span>
        </button>
        <button
          type="button"
          class="navitem"
          aria-pressed={consoleOpen.value}
          title="Status console (Ctrl/⌘ + `)"
          onClick={() => (consoleOpen.value = !consoleOpen.value)}
        >
          <TerminalIcon />
          <span class="navitem-label">Status console</span>
        </button>
        <a class="navitem" href={REPO_URL} target="_blank" rel="noopener noreferrer" title="Source on GitHub">
          <GithubIcon />
          <span class="navitem-label">Source code</span>
        </a>
      </div>

      <section class="sidebar-net" aria-label="Network">
        <NetworkBadge />
        <p class="sidebar-net-note">{NAT_DETAIL[nat.value]}</p>
      </section>
    </nav>
  )
}

/**
 * Wide screens get a framed workspace (sidebar, main column, optional side panel). Phones get whatever
 * `children` already render, header included, so the mobile layout stays a single column.
 */
export function AppFrame({
  desktop,
  aside,
  dragging,
  children,
}: {
  desktop: boolean
  aside?: ComponentChildren
  dragging?: boolean
  children: ComponentChildren
}) {
  const drag = dragging ? ' shell--dragging' : ''
  if (!desktop) return <div class={`shell${drag}`}>{children}</div>
  return (
    <div class={`shell shell--frame${drag}`}>
      <div class={`frame${aside ? ' frame--aside' : ''}`}>
        <Sidebar />
        <div class="frame-main">{children}</div>
        {aside && <div class="frame-aside">{aside}</div>}
      </div>
    </div>
  )
}
