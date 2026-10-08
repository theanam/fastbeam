export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class="switch"
      onClick={() => onChange(!checked)}
    >
      <span class="switch-track">
        <span class="switch-knob" />
      </span>
    </button>
  )
}
