import { device } from '../../../state/identity'
import { EditableName } from '../../components/EditableName'
import { DeviceIcon } from '../../components/Icons'

/** Who this device is, always at the top so people know what the other side will see. */
export function Identity() {
  return (
    <section
      class={
        'relative isolate flex items-center gap-4 overflow-hidden rounded-tile bg-button px-5 py-[18px] text-on-button shadow-soft ' +
        'desk:gap-5 desk:px-6 desk:py-[22px] [&_:focus-visible]:outline-on-button ' +
        'after:pointer-events-none after:absolute after:-top-[110px] after:-right-[70px] after:z-[-1] after:size-[280px] after:rounded-full ' +
        'after:bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-on-button)_16%,transparent),transparent_68%)]'
      }
      aria-label="This device"
    >
      <span
        class="inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-on-button)_16%,transparent)] desk:size-16 desk:rounded-[18px]"
        aria-hidden="true"
      >
        <DeviceIcon type={device.deviceType} size={28} />
      </span>
      <div class="flex min-w-0 flex-col items-start">
        <div class="text-14 font-semibold">You're visible as</div>
        <EditableName />
        <div class="text-14 font-medium">
          {device.platform} &middot; {device.browser}
        </div>
      </div>
    </section>
  )
}
