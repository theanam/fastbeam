import { useEffect, useState } from 'preact/hooks'
import { codeFromText, joinWithCode } from '../../net/pairing'
import { toast } from '../../state/toast'
import { closeSheet, hasPending } from '../../state/ui'
import { CodeBoxes } from '../components/CodeBoxes'
import { PasteIcon } from '../components/Icons'
import { Scanner } from '../components/Scanner'
import { onPairedDefault } from './pairActions'

/** Screen 8. */
export function ScanEnter({ prefill = '' }: { prefill?: string }) {
  const [code, setCode] = useState(prefill)
  const [chip, setChip] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = (c: string) => {
    if (submitted) return
    setSubmitted(true)
    closeSheet()
    joinWithCode(c, { intent: hasPending(), onPaired: onPairedDefault })
  }

  useEffect(() => {
    let alive = true
    const perms = navigator.permissions?.query?.bind(navigator.permissions)
    if (!perms || !navigator.clipboard?.readText) return
    perms({ name: 'clipboard-read' as PermissionName })
      .then(async (st) => {
        if (!alive || st.state !== 'granted') return
        const text = await navigator.clipboard.readText().catch(() => '')
        const c = codeFromText(text)
        if (alive && c) setChip(c)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const paste = async () => {
    if (chip) {
      setCode(chip)
      submit(chip)
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      const c = codeFromText(text)
      if (c) {
        setCode(c)
        submit(c)
      } else toast('No fastbeam code on the clipboard')
    } catch {
      toast('Clipboard access was blocked. Type the code instead.')
    }
  }

  return (
    <>
      <Scanner onCode={submit} paused={submitted} />
      <div class="or-rule">
        <span />
        or type the code
        <span />
      </div>
      <CodeBoxes value={code} onChange={setCode} onSubmit={submit} autoFocus={!!prefill} disabled={submitted} />
      {typeof navigator.clipboard?.readText === 'function' && (
        <button type="button" class="chip" onClick={() => void paste()}>
          <PasteIcon /> {chip ? `Paste ${chip}` : 'Paste'}
        </button>
      )}
    </>
  )
}
