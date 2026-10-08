import type { JSX } from 'preact'

export type ButtonAttrs = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className'>
