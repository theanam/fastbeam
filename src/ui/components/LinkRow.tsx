import { rowIcon, rowLink, rowLinkTitle, rowSub, rowText } from '../classes'
import { ExternalIcon } from './Icons'

export function LinkRow({ href, icon, title, sub }: { href: string; icon: preact.ComponentChildren; title: string; sub: string }) {
  const external = href.startsWith('http')
  return (
    <a
      class={rowLink}
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span class={rowIcon}>{icon}</span>
      <span class={rowText}>
        <span class={rowLinkTitle}>{title}</span>
        <span class={rowSub}>{sub}</span>
      </span>
      <span class="inline-flex flex-none text-muted">
        <ExternalIcon />
      </span>
    </a>
  )
}
