import type { DeviceOs, DeviceType } from '../../state/device'
import { osFromPlatform } from '../../state/device'
import type { Peer } from '../../state/peers'
import { DeviceIcon, type IconProps } from './Icons'

/* Platform marks. Apple's is the familiar silhouette; Windows and Android are simple geometric glyphs
   drawn in-house; everything else falls back to the generic phone / tablet / laptop outline. */

export function AppleIcon({ size = 24, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

export function WindowsIcon({ size = 24, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
      <path d="M3 3h8.4v8.4H3zM12.6 3H21v8.4h-8.4zM3 12.6h8.4V21H3zM12.6 12.6H21V21h-8.4z" />
    </svg>
  )
}

export function AndroidIcon({ size = 24, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
      <path d="M17.6 9.5l1.9-3.3a.4.4 0 0 0-.7-.4l-1.9 3.3A11.3 11.3 0 0 0 12 8c-1.8 0-3.4.4-4.9 1.1L5.2 5.8a.4.4 0 0 0-.7.4l1.9 3.3C3.2 11.2 1 14.4 1 18h22c0-3.6-2.2-6.8-5.4-8.5zM7 15.2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  )
}

export function ChromeIcon({ size = 20, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={cls}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M21.17 8H12M3.95 6.06 8.54 14M10.88 21.94 15.46 14" />
    </svg>
  )
}

export function SafariIcon({ size = 20, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={cls}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GlobeIcon({ size = 20, class: cls }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={cls}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function peerOs(p: Pick<Peer, 'os' | 'platform' | 'deviceType'>): DeviceOs {
  return p.os ?? osFromPlatform(p.platform, p.deviceType)
}

export function browserFamily(browser: string): 'chrome' | 'safari' | 'firefox' | 'edge' | 'other' {
  const b = browser.toLowerCase()
  if (b.startsWith('edge')) return 'edge'
  if (b.startsWith('chrome')) return 'chrome'
  if (b.startsWith('safari')) return 'safari'
  if (b.startsWith('firefox')) return 'firefox'
  return 'other'
}

/** The main mark for a device: platform first, generic device outline otherwise. */
export function PlatformIcon({ os, deviceType, size = 24 }: { os: DeviceOs; deviceType: DeviceType; size?: number }) {
  if (os === 'ios' || os === 'macos') return <AppleIcon size={size} />
  if (os === 'windows') return <WindowsIcon size={Math.round(size * 0.85)} />
  if (os === 'android') return <AndroidIcon size={size} />
  return <DeviceIcon type={deviceType} size={size} />
}

/** Small browser badge: Chrome and Safari get their own glyph, the rest a globe. */
export function BrowserIcon({ browser, size = 14 }: { browser: string; size?: number }) {
  const fam = browserFamily(browser)
  if (fam === 'chrome') return <ChromeIcon size={size} />
  if (fam === 'safari') return <SafariIcon size={size} />
  return <GlobeIcon size={size} />
}

/**
 * Avatar with the platform mark and a browser badge in the corner. `class` replaces the default round
 * tint (shape and colours), e.g. the rounded-square tile avatar that fills on hover.
 */
export function DeviceAvatar({
  peer,
  size = 48,
  class: cls = 'rounded-full bg-tint text-link',
}: {
  peer: Pick<Peer, 'os' | 'platform' | 'deviceType' | 'browser'>
  size?: number
  class?: string
}) {
  const os = peerOs(peer)
  const badge = Math.round(size * 0.44)
  return (
    <span
      class={`relative inline-flex flex-none items-center justify-center overflow-visible ${cls}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <PlatformIcon os={os} deviceType={peer.deviceType} size={Math.round(size * 0.5)} />
      <span
        class="absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full border-[1.5px] border-line bg-surface text-muted"
        style={{ width: badge, height: badge }}
        title={peer.browser}
      >
        <BrowserIcon browser={peer.browser} size={Math.round(badge * 0.68)} />
      </span>
    </span>
  )
}
