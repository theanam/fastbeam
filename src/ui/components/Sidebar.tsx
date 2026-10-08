import { REPO_URL } from '../../config'
import { consoleOpen } from '../../state/log'
import { NAT_DETAIL, nat } from '../../state/network'
import { goBack, navigate, screen } from '../../state/router'
import { NetworkBadge } from './NetworkBadge'
import { GithubIcon, Mark, SlidersIcon, TerminalIcon, Wordmark, WifiIcon } from './Icons'

/** Icons only in the 900-1179px rail; labels from `wide:` up. */
const navItem =
  'flex h-[46px] w-12 items-center justify-center gap-3 rounded-xl p-0 text-15 font-semibold whitespace-nowrap text-muted no-underline transition-colors duration-160 ease-fb hover:bg-chip hover:text-ink active:scale-[0.98] aria-pressed:text-link aria-[current=page]:bg-surface aria-[current=page]:text-link aria-[current=page]:shadow-raised wide:w-auto wide:justify-start wide:px-3 [&>svg]:flex-none'
const navLabel = 'max-wide:hidden'

/** Desktop navigation rail: the same destinations as the phone header, with labels. */
export function Sidebar() {
  const here = screen.value
  return (
    <nav
      class="flex flex-col items-center gap-7 border-r border-line-soft bg-sunken px-3 py-6 wide:items-stretch wide:px-4"
      aria-label="fastbeam"
    >
      <div class="flex min-h-10 min-w-0 items-center gap-2.5 px-1.5">
        <Mark class="size-9 flex-none" />
        <Wordmark class="max-wide:hidden" />
      </div>

      <div class="flex flex-col gap-1">
        <button
          type="button"
          class={navItem}
          aria-current={here === 'home' ? 'page' : undefined}
          onClick={() => here !== 'home' && goBack()}
        >
          <WifiIcon />
          <span class={navLabel}>Nearby</span>
        </button>
        <button
          type="button"
          class={navItem}
          aria-current={here === 'settings' ? 'page' : undefined}
          onClick={() => navigate('settings')}
        >
          <SlidersIcon />
          <span class={navLabel}>Settings</span>
        </button>
        <button
          type="button"
          class={navItem}
          aria-pressed={consoleOpen.value}
          title="Status console (Ctrl/⌘ + `)"
          onClick={() => (consoleOpen.value = !consoleOpen.value)}
        >
          <TerminalIcon />
          <span class={navLabel}>Status console</span>
        </button>
        <a class={navItem} href={REPO_URL} target="_blank" rel="noopener noreferrer" title="Source on GitHub">
          <GithubIcon />
          <span class={navLabel}>Source code</span>
        </a>
      </div>

      <section
        class="mt-auto flex flex-col items-center gap-2 rounded-2xl border border-line-soft bg-surface p-2 wide:items-start wide:p-3.5"
        aria-label="Network"
      >
        <NetworkBadge class="max-wide:w-8 max-wide:justify-center max-wide:px-0 max-wide:text-[0px] max-wide:[&>span]:size-2.5" />
        <p class="text-13 leading-[1.45] text-muted max-wide:hidden">{NAT_DETAIL[nat.value]}</p>
      </section>
    </nav>
  )
}
