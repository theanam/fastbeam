import { REPO_URL } from '../../config'
import { consoleOpen } from '../../state/log'
import { NAT_DETAIL, nat } from '../../state/network'
import { goBack, navigate, screen } from '../../state/router'
import { NetworkBadge } from './NetworkBadge'
import { GithubIcon, Mark, SlidersIcon, TerminalIcon, Wordmark, WifiIcon } from './Icons'

/** Desktop navigation rail: the same destinations as the phone header, with labels. */
export function Sidebar() {
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
