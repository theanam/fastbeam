import type { ComponentChildren } from 'preact'
import { cx } from '../classes'
import { Sidebar } from './Sidebar'

/** `group/shell` with data-dragging lets tiles react while files are dragged over the window. */
const shell = 'group/shell mx-auto flex w-full flex-1 flex-col min-h-[calc(100dvh-var(--console-h,0px))]'

/**
 * Wide screens get a framed workspace (sidebar, main column, optional side panel). Phones get whatever
 * `children` already render, header included, so the mobile layout stays a single column.
 */
export function AppFrame({
  desktop,
  aside,
  dragging,
  children,
}: {
  desktop: boolean
  aside?: ComponentChildren
  dragging?: boolean
  children: ComponentChildren
}) {
  const drag = dragging ? '' : undefined
  if (!desktop)
    return (
      <div class={cx(shell, 'max-w-[1120px]')} data-dragging={drag}>
        {children}
      </div>
    )
  return (
    <div class={cx(shell, 'max-w-[1440px] p-5')} data-dragging={drag}>
      <div
        class={cx(
          'grid flex-1 min-h-[calc(100dvh-40px)] overflow-hidden rounded-frame border border-line bg-surface shadow-frame',
          aside
            ? 'grid-cols-[76px_minmax(0,1fr)_320px] wide:grid-cols-[236px_minmax(0,1fr)_340px]'
            : 'grid-cols-[76px_minmax(0,1fr)] wide:grid-cols-[236px_minmax(0,1fr)]',
        )}
      >
        <Sidebar />
        <div class="flex min-w-0 flex-col">{children}</div>
        {aside && <div class="flex flex-col gap-4 border-l border-line-soft bg-sunken px-5 py-6">{aside}</div>}
      </div>
    </div>
  )
}
