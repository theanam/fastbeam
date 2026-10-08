import { NAT_LABEL, nat, type NatResult } from '../../state/network'
import { badge, badgeDot, badgeTone, cx } from '../classes'

const TONE: Record<NatResult, keyof typeof badgeTone> = {
  checking: 'neutral',
  open: 'ok',
  symmetric: 'warn',
  'udp-blocked': 'warn',
  unknown: 'neutral',
}

/** `class` adjusts layout, e.g. the icon-only badge in the desktop rail. */
export function NetworkBadge({ class: cls }: { class?: string }) {
  const r = nat.value
  const tone = TONE[r]
  return (
    <span class={cx(badge, badgeTone[tone], cls)} role="status" aria-label={`Network: ${NAT_LABEL[r]}`}>
      <span class={badgeDot[tone]} />
      {NAT_LABEL[r]}
    </span>
  )
}
