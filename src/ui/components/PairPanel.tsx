import { useState } from 'preact/hooks'
import { codeFromText, host, isValidCode, joinWithCode, normalizeCodeInput } from '../../net/pairing'
import { hasPending, openPairSheet } from '../../state/ui'
import { mono, rowSub, rule } from '../classes'
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
    <aside
      class="flex flex-col gap-4 rounded-tile border border-line bg-surface p-[22px] shadow-raised"
      aria-label="Pair with a code">
      <div class="text-left font-display text-20 font-bold tracking-title text-ink">Not on the same Wi‑Fi?</div>
      <div class="flex flex-col gap-2">
        <div class={rowSub}>Your code</div>
        <div class="flex items-center justify-start">
          <button
            type="button"
            class={`${mono} -ml-1.5 min-w-0 rounded-xl px-1.5 py-0.5 text-left text-30 leading-[1.1] tracking-[0.12em] text-link transition-colors duration-120 hover:bg-tint`}
            aria-label={h ? `Code ${h.code.split('').join(' ')}` : 'Getting a code'}
            title="Click to copy the code"
            disabled={!h}
            onClick={() => h && void copyCode(h.code)}
          >
            {h ? (
              <>
                {h.code.slice(0, 3)}
                <span class="text-[color-mix(in_srgb,var(--color-muted)_60%,var(--color-line))]">·</span>
                {h.code.slice(3)}
              </>
            ) : (
              '···  ···'
            )}
          </button>
          <IconButton label="Copy code" size="sm" tone="muted" disabled={!h} onClick={() => h && void copyCode(h.code)}>
            <CopyIcon size={18} />
          </IconButton>
          <IconButton label="Show QR code" size="sm" tone="muted" disabled={!h} onClick={() => openPairSheet('show')}>
            <QrIcon size={18} />
          </IconButton>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" disabled={!h} onClick={() => h && void copyLink(h.code)}>
            Copy link
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openPairSheet('show')}>
            {h?.locked ? 'Password on' : 'Add password'}
          </Button>
        </div>
      </div>
      <div class={rule} />
      <div class="flex flex-col gap-2">
        <label class={rowSub} for="join-code">
          Have someone else&rsquo;s code?
        </label>
        <div class="flex gap-2">
          <input
            id="join-code"
            class="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ground px-3.5 font-mono text-17 font-medium tracking-[0.1em] text-ink outline-none placeholder:font-ui placeholder:font-medium placeholder:tracking-normal placeholder:text-muted focus:border-accent"
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
          <Button variant="primary" size="md" class="font-bold!" disabled={!isValidCode(code)} onClick={() => submit(code)}>
            Connect
          </Button>
        </div>
        <Button variant="link" class="self-start" onClick={() => openPairSheet('scan')}>
          Scan a QR instead
        </Button>
      </div>
    </aside>
  )
}
