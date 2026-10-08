export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class="group/switch inline-flex h-12 w-15 flex-none items-center justify-center rounded-full"
      onClick={() => onChange(!checked)}
    >
      <span class="flex h-8 w-13 justify-start rounded-full bg-line p-[3px] transition-colors duration-160 group-aria-checked/switch:justify-end group-aria-checked/switch:bg-button">
        <span class="size-[26px] rounded-full bg-white shadow-raised" />
      </span>
    </button>
  )
}
