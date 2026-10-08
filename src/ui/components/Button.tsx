import type { ComponentChildren } from 'preact'
import { cx } from '../classes'
import type { ButtonAttrs } from './buttonAttrs'

type Variant = 'primary' | 'secondary' | 'link' | 'quiet'
type Size = 'sm' | 'md' | 'default' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-button text-on-button hover:enabled:brightness-[1.08]',
  secondary: 'border border-line bg-surface text-ink hover:enabled:bg-chip',
  link: 'font-bold text-link hover:enabled:text-link-hover',
  quiet: 'self-center text-ink',
}

/** Filled and outlined buttons. */
const BOX: Record<Size, string> = {
  sm: 'h-10 rounded-xl px-3.5 text-14',
  md: 'h-12 rounded-btn px-4.5 text-15',
  default: 'h-13 rounded-btn px-4.5 text-16',
  lg: 'h-14 rounded-btn px-4.5 text-17 font-bold',
}

/** Text-only buttons: `md` gives a link a padded 44px target, e.g. inside an input row. */
const TEXT: Record<Size, string> = {
  sm: 'h-10 p-0 text-14',
  md: 'h-11 px-3 text-14',
  default: 'h-10 p-0 text-14',
  lg: 'h-12 px-4.5 text-16',
}

/**
 * `class` is for layout only (margins, width, self-alignment, order). Size and colour come from
 * `variant` and `size`.
 */
export function Button({
  variant = 'secondary',
  size = 'default',
  class: cls,
  children,
  ...rest
}: { variant?: Variant; size?: Size; class?: string; children: ComponentChildren } & ButtonAttrs) {
  const box = variant === 'link' ? TEXT[size] : variant === 'quiet' ? TEXT.lg : BOX[size]
  return (
    <button
      type="button"
      class={cx(
        'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[filter,background-color,color] duration-120',
        VARIANT[variant],
        box,
        cls,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
