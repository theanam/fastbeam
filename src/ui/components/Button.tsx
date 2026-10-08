import type { ComponentChildren } from 'preact'
import { ButtonAttrs } from './buttonAttrs'

export function Button({
  variant = 'secondary',
  class: cls,
  children,
  ...rest
}: { variant?: 'primary' | 'secondary' | 'link'; class?: string; children: ComponentChildren } & ButtonAttrs) {
  return (
    <button type="button" class={`btn btn--${variant}${cls ? ` ${cls}` : ''}`} {...rest}>
      {children}
    </button>
  )
}
