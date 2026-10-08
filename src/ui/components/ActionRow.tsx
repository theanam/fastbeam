import { rowIcon, rowLink, rowLinkTitle, rowSub, rowText } from '../classes'

export function ActionRow({ icon, title, sub, onClick }: { icon: preact.ComponentChildren; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" class={`${rowLink} w-full text-left`} onClick={onClick}>
      <span class={rowIcon}>{icon}</span>
      <span class={rowText}>
        <span class={rowLinkTitle}>{title}</span>
        <span class={rowSub}>{sub}</span>
      </span>
    </button>
  )
}
