export function ActionRow({ icon, title, sub, onClick }: { icon: preact.ComponentChildren; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" class="row row--link row--button" onClick={onClick}>
      <span class="row-icon">{icon}</span>
      <span class="row-text">
        <span class="row-title">{title}</span>
        <span class="row-sub">{sub}</span>
      </span>
    </button>
  )
}
