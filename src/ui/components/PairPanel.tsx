import { useState } from 'preact/hooks'
import { codeFromText, host, isValidCode, joinWithCode, normalizeCodeInput } from '../../net/pairing'
import { hasPending, openPairSheet } from '../../state/ui'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { CopyIcon, QrIcon } from './Icons'
import { copyCode, copyLink, onPairedDefault, useHosting } from '../sheets/pairActions'

/** Screen 13's side panel: the code is always on show on desktop; QR and password open the full sheet. */
export function PairPanel() {
  useHosting()
  const h = host.value
  const [code, setCode] = useState('')

  const submit = (c: string) => {
    if (!isValidCode(c)) return
    setCode('')
    joinWithCode(c, { intent: hasPending(), onPaired: onPairedDefault })
  }

  return (
    <aside class="pair-entry pair-panel" aria-label="Pair with a code">
      <div class="pair-entry-title">Not on the same Wi‑Fi?</div>
      <div class="pair-panel-block">
        <div class="row-sub">Your code</div>
        <div class="code-row code-row--panel">
          <button
            type="button"
            class="panelcode panelcode--btn mono"
            aria-label={h ? `Code ${h.code.split('').join(' ')}` : 'Getting a code'}
            title="Click to copy the code"
            disabled={!h}
            onClick={() => h && void copyCode(h.code)}
          >
            {h ? (
              <>
                {h.code.slice(0, 3)}
                <span class="bigcode-dot">·</span>
                {h.code.slice(3)}
              </>
            ) : (
              '···  ···'
            )}
          </button>
          <IconButton label="Copy code" class="code-copy" disabled={!h} onClick={() => h && void copyCode(h.code)}>
            <CopyIcon size={18} />
          </IconButton>
          <IconButton label="Show QR code" class="code-copy" disabled={!h} onClick={() => openPairSheet('show')}>
            <QrIcon size={18} />
          </IconButton>
        </div>
        <div class="pair-panel-actions pair-panel-actions--two">
          <Button variant="secondary" class="btn--sm" disabled={!h} onClick={() => h && void copyLink(h.code)}>
            Copy link
          </Button>
          <Button variant="secondary" class="btn--sm" onClick={() => openPairSheet('show')}>
            {h?.locked ? 'Password on' : 'Add password'}
          </Button>
        </div>
      </div>
      <div class="rule" />
      <div class="pair-panel-block">
        <label class="row-sub" for="join-code">
          Have someone else&rsquo;s code?
        </label>
        <div class="pair-panel-join">
          <input
            id="join-code"
            class="mono-input mono-input--boxed"
            type="text"
            placeholder="6 characters"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck={false}
            value={code}
            onInput={(e) => {
              const raw = (e.currentTarget as HTMLInputElement).value
              const fromLink = codeFromText(raw)
              const next = fromLink ?? normalizeCodeInput(raw).slice(0, 6)
              setCode(next)
              if (isValidCode(next)) submit(next)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit(code)}
          />
          <Button variant="primary" class="btn--sm" disabled={!isValidCode(code)} onClick={() => submit(code)}>
            Connect
          </Button>
        </div>
        <button type="button" class="btn btn--link" onClick={() => openPairSheet('scan')}>
          Scan a QR instead
        </button>
      </div>
    </aside>
  )
}
