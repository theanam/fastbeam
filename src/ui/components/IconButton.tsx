import type { ComponentChildren } from 'preact'
import { ButtonAttrs } from './buttonAttrs'

export function IconButton({
  label,
  children,
  class: cls,
  ...rest
}: { label: string; children: ComponentChildren; class?: string } & ButtonAttrs) {
  return (
    <button type="button" class={cls ? `iconbtn ${cls}` : 'iconbtn'} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}
