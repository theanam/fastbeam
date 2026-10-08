import { device } from '../../../state/identity'
import { EditableName } from '../../components/EditableName'
import { DeviceIcon } from '../../components/Icons'

/** Who this device is, always at the top so people know what the other side will see. */
export function Identity() {
  return (
    <section class="me-card" aria-label="This device">
      <span class="me-icon" aria-hidden="true">
        <DeviceIcon type={device.deviceType} size={28} />
      </span>
      <div class="me-text">
        <div class="eyebrow">You're visible as</div>
        <EditableName />
        <div class="me-sub">
          {device.platform} &middot; {device.browser}
        </div>
      </div>
    </section>
  )
}
