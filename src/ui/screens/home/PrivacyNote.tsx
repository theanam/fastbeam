import { ShieldPlainIcon } from '../../components/Icons'

/** Desktop side panel footer: the one promise people need before sending anything. */
export function PrivacyNote() {
  return (
    <section class="privacy">
      <span class="privacy-icon" aria-hidden="true">
        <ShieldPlainIcon size={20} />
      </span>
      <div>
        <div class="privacy-title">Nothing is uploaded</div>
        <p class="privacy-copy">Files and text go straight between the two browsers, encrypted. No accounts.</p>
      </div>
    </section>
  )
}
