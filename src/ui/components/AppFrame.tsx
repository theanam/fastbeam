import type { ComponentChildren } from 'preact'
import { Sidebar } from './Sidebar'

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
  const drag = dragging ? ' shell--dragging' : ''
  if (!desktop) return <div class={`shell${drag}`}>{children}</div>
  return (
    <div class={`shell shell--frame${drag}`}>
      <div class={`frame${aside ? ' frame--aside' : ''}`}>
        <Sidebar />
        <div class="frame-main">{children}</div>
        {aside && <div class="frame-aside">{aside}</div>}
      </div>
    </div>
  )
}
