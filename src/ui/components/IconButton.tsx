import type { ComponentChildren } from 'preact'
import { cx } from '../classes'
import type { ButtonAttrs } from './buttonAttrs'

export interface IconButtonLook {
  /** Filled circle at rest instead of a plate that only shows on hover. */
  round?: boolean | undefined
  /** `sm` is a 40px box for tight rows; default is the 48px hit box. */
  size?: 'sm' | 'md' | undefined
  /** `inherit` leaves the colour to the caller's `class`, e.g. light icons over media. */
  tone?: 'ink' | 'muted' | 'inherit' | undefined
}

const TONE = { ink: 'text-ink', muted: 'text-muted hover:text-link', inherit: '' } as const

/** Classes for anything drawn as an icon button, including links that look like one. */
export const iconButtonClass = ({ round, size, tone = 'ink' }: IconButtonLook = {}) =>
  cx(
    'relative inline-flex flex-none items-center justify-center no-underline [&>svg]:relative',
    'before:absolute before:inset-0.5 before:transition-colors before:duration-120 hover:before:bg-chip active:before:bg-chip',
    size === 'sm' ? 'size-10' : 'size-12',
    round ? 'rounded-full before:rounded-full before:bg-chip' : 'rounded-xl before:rounded-xl before:bg-transparent',
    TONE[tone],
  )

/** `class` is for layout (and colour with tone="inherit"); look comes from the props. */
export function IconButton({
  label,
  children,
  round,
  size,
  tone,
  class: cls,
  ...rest
}: { label: string; children: ComponentChildren; class?: string } & IconButtonLook & ButtonAttrs) {
  return (
    <button
      type="button"
      class={cx(iconButtonClass({ round, size, tone }), cls)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
