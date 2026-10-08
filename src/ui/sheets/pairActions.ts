import { useEffect } from 'preact/hooks'
import { formatCode, pairLink, startHosting, stopHosting } from '../../net/pairing'
import { toast } from '../../state/toast'
import { hasPending, openSendSheet } from '../../state/ui'
import type { Peer } from '../../state/peers'

/** What happens after a successful pairing from anywhere (sheet, panel, link, scanner). */
export function onPairedDefault(peer: Peer): void {
  if (hasPending()) openSendSheet(peer.deviceId)
}

/** Keeps hosting alive while any Show-my-code UI is mounted (sheet tab or desktop panel). */
let hostUsers = 0

export function useHosting(): void {
  useEffect(() => {
    hostUsers++
    startHosting()
    return () => {
      hostUsers--
      if (hostUsers === 0) stopHosting()
    }
  }, [])
}

export async function copyCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code)
    toast(`Code ${formatCode(code)} copied`)
  } catch {
    toast('Couldn\u2019t copy the code')
  }
}

export async function copyLink(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(pairLink(code))
    toast('Link copied')
  } catch {
    toast('Couldn’t copy the link')
  }
}

export async function shareLink(code: string): Promise<void> {
  try {
    await navigator.share({ title: 'fastbeam', text: 'Connect to my device on fastbeam', url: pairLink(code) })
  } catch {
    /* dismissed */
  }
}
