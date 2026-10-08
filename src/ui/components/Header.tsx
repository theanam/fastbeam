import { REPO_URL } from '../../config'
import { consoleOpen } from '../../state/log'
import { navigate } from '../../state/router'
import { cx } from '../classes'
import { IconButton, iconButtonClass } from './IconButton'
import { GithubIcon, Mark, SlidersIcon, TerminalIcon, Wordmark } from './Icons'
import { NetworkBadge } from './NetworkBadge'

export function Header() {
  return (
    <header class="flex items-center justify-between gap-2 pt-[calc(12px+env(safe-area-inset-top))] pr-2.5 pb-3 pl-5">
      <div class="flex min-w-0 items-center gap-2.5">
        <Mark class="size-8 flex-none desk:size-9" />
        {/* Not enough room for mark + wordmark + badge below 360px: keep the mark, drop the text. */}
        <Wordmark class="max-[359px]:hidden" />
      </div>
      <div class="flex items-center gap-1">
        <NetworkBadge class="max-[359px]:px-2.5 max-[359px]:text-12" />
        <IconButton
          label={consoleOpen.value ? 'Hide status console' : 'Show status console'}
          class="max-desk:hidden aria-pressed:text-link"
          aria-pressed={consoleOpen.value}
          title="Status console (Ctrl/⌘ + `)"
          onClick={() => (consoleOpen.value = !consoleOpen.value)}
        >
          <TerminalIcon />
        </IconButton>
        {/* The GitHub shortcut needs room; narrow phones keep it in Help & about instead. */}
        <a
          class={cx(iconButtonClass(), 'max-[599px]:hidden')}
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
