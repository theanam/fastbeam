import { ShieldPlainIcon } from '../../components/Icons'

/** Desktop side panel footer: the one promise people need before sending anything. */
export function PrivacyNote() {
  return (
    <section class="flex gap-3 rounded-tile bg-tint p-4 text-body">
      <span
        class="inline-flex size-9 flex-none items-center justify-center rounded-[10px] bg-surface text-link"
        aria-hidden="true"
      >
        <ShieldPlainIcon size={20} />
      </span>
      <div>
        <div class="text-15 font-bold text-ink">Nothing is uploaded</div>
        <p class="text-14 leading-[1.45]">Files and text go straight between the two browsers, encrypted. No accounts.</p>
      </div>
    </section>
  )
}
