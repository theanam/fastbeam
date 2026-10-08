import { REPO_URL } from '../../config'
import { consoleOpen } from '../../state/log'
import { navigate } from '../../state/router'
import { IconButton } from './IconButton'
import { GithubIcon, Mark, SlidersIcon, TerminalIcon, Wordmark } from './Icons'
import { NetworkBadge } from './NetworkBadge'

export function Header() {
  return (
    <header class="header">
      <div class="brand">
        <Mark class="brand-mark" />
        <Wordmark />
      </div>
      <div class="header-right">
        <NetworkBadge />
        <IconButton
          label={consoleOpen.value ? 'Hide status console' : 'Show status console'}
          class="header-console"
          aria-pressed={consoleOpen.value}
          title="Status console (Ctrl/⌘ + `)"
          onClick={() => (consoleOpen.value = !consoleOpen.value)}
        >
          <TerminalIcon />
        </IconButton>
        <a
          class="iconbtn header-gh"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="fastbeam on GitHub"
          title="Source on GitHub"
        >
          <GithubIcon />
        </a>
        <IconButton label="Settings" onClick={() => navigate('settings')}>
          <SlidersIcon />
        </IconButton>
      </div>
    </header>
  )
}
