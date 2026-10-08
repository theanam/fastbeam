/**
 * Tailwind class lists shared by several components, so the same pattern renders identically everywhere.
 * Single-use styling lives inline in its component instead.
 */

/** Joins class fragments, skipping falsy ones: cx('a', on && 'b'). */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// Cards and list rows

export const card = 'bg-surface border border-line rounded-tile'
export const cardList = `${card} flex flex-col px-4 py-1`
export const cardPad = `${card} flex flex-col gap-2.5 p-4`

const rowBase = 'flex items-center gap-3 border-b border-line-soft last:border-b-0'
export const row = `${rowBase} min-h-16`
export const rowText = 'flex flex-1 flex-col min-w-0'
export const rowTitle = 'text-16 font-semibold'
export const rowSub = 'text-13 text-muted'
export const rowIcon = 'inline-flex size-9 flex-none items-center justify-center rounded-[10px] bg-tint text-link'
/** A row that is itself a link or button: the title turns link-coloured on hover. */
export const rowLink = `${rowBase} group/row min-h-15 text-inherit no-underline`
export const rowLinkTitle = `${rowTitle} group-hover/row:text-link`

// Full-screen flows (connecting, password, sorry, progress, done)

export const screen =
  'mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-[22px] px-5 pt-[calc(8px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] min-h-[calc(100dvh-var(--console-h,0px))]'
export const screenHead = 'flex min-h-11 items-center justify-between gap-2'
export const screenTitle = 'm-0 text-center font-display text-30 leading-[1.1] font-extrabold tracking-display'
export const screenCopy = 'mx-auto max-w-[320px] text-center text-16 leading-normal text-body text-pretty'

// Sheet header

export const sheetHead = 'flex flex-none items-center gap-3'
export const sheetHeadText = 'flex flex-1 min-w-0 flex-col gap-0.5'
export const sheetTitle = 'm-0 font-display text-22 leading-[1.15] font-bold tracking-title'

// Small text and labels

export const eyebrowCaps = 'text-13 font-bold tracking-[0.06em] uppercase text-muted'
export const live = 'flex items-center gap-2'
export const dotLive = 'size-2 flex-none rounded-full bg-accent motion-safe:animate-dot'
export const mono = 'font-mono font-bold'
export const kbd = 'rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-13 text-ink'
export const chip =
  'inline-flex h-11 items-center gap-2 self-center rounded-full bg-tint px-4 text-15 font-bold text-link'
export const codechip = `${mono} text-17 tracking-[0.12em] text-muted`
export const alert = 'flex items-center gap-2 rounded-xl px-3 py-2.5 text-14 leading-[1.4] font-semibold'
export const alertWarn = `${alert} bg-warn-bg text-warn-ink`
export const rule = 'h-px bg-line'

// Badges (network state, chips on device details)

export const badge = 'inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-13 font-semibold whitespace-nowrap'
export const badgeTone = {
  neutral: 'bg-chip text-muted',
  ok: 'bg-tint text-link',
  warn: 'bg-warn-bg text-warn-ink',
} as const
export const badgeDot = {
  neutral: 'size-[7px] flex-none rounded-full bg-chip-dot',
  ok: 'size-[7px] flex-none rounded-full bg-accent',
  warn: 'size-[7px] flex-none rounded-full bg-current',
} as const

// Form fields

export const field = 'flex flex-col gap-2'
export const fieldLabel = 'text-14 font-semibold text-muted'
export const inputRow =
  'flex h-13 items-center gap-1 rounded-btn border border-line bg-surface pr-1 pl-4 transition-shadow duration-120 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-tint)]'
export const inputRowWarn = 'border-warn-ink! focus-within:border-warn-ink!'
export const plainInput = 'h-full min-w-0 flex-1 border-0 bg-transparent text-17 font-semibold text-ink outline-none'
export const monoInput =
  'h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-16 font-medium text-ink outline-none placeholder:font-ui placeholder:font-medium placeholder:tracking-normal placeholder:text-muted'
