import { ExternalIcon } from './Icons'

export function LinkRow({ href, icon, title, sub }: { href: string; icon: preact.ComponentChildren; title: string; sub: string }) {
  const external = href.startsWith('http')
  return (
    <a
      class="row row--link"
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span class="row-icon">{icon}</span>
      <span class="row-text">
        <span class="row-title">{title}</span>
        <span class="row-sub">{sub}</span>
      </span>
      <span class="row-ext muted">
        <ExternalIcon />
      </span>
    </a>
  )
}
