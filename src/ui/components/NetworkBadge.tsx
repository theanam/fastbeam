import { NAT_LABEL, nat, type NatResult } from '../../state/network'

const TONE: Record<NatResult, string> = {
  checking: '',
  open: 'badge--ok',
  symmetric: 'badge--warn',
  'udp-blocked': 'badge--warn',
  unknown: '',
}

export function NetworkBadge() {
  const r = nat.value
  const tone = TONE[r]
  return (
    <span class={tone ? `badge ${tone}` : 'badge'} role="status" aria-label={`Network: ${NAT_LABEL[r]}`}>
      <span class="badge-dot" />
      {NAT_LABEL[r]}
    </span>
  )
}
