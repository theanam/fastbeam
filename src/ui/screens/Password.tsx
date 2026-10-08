import { useState } from 'preact/hooks'
import { cancelJoin, formatCode, joining, submitJoinPassword } from '../../net/pairing'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { BackIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon } from '../components/Icons'

/** Screen 9. Shown only once `auth-required` has arrived, so a host is really there. */
export function Password() {
  const j = joining.value
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  if (!j) return null
  const submit = () => {
    if (pw.trim().length < 4 || j.checking) return
    submitJoinPassword(pw)
  }
  return (
    <div class="screen">
      <header class="screen-head screen-head--left">
        <IconButton label="Back" onClick={cancelJoin}>
          <BackIcon />
        </IconButton>
        <span class="mono codechip">{formatCode(j.code)}</span>
      </header>
      <div class="pw-hero">
        <span class="pw-lock">
          <LockKeyholeIcon />
        </span>
        <h1 class="screen-title">{j.hostName ?? 'The other device'} set a password</h1>
        <p class="screen-copy">Ask them for it. It&rsquo;s checked on this device and never sent over the internet.</p>
      </div>
      <div class="field">
        <label class="field-label field-label--ink" for="join-pw">
          Password
        </label>
        <div class={`input-row input-row--tall${j.wrong ? ' input-row--warn' : ''}`}>
          <input
            id="join-pw"
            class="mono-input"
            type={show ? 'text' : 'password'}
            value={pw}
            autofocus
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            enterkeyhint="go"
            disabled={j.checking}
            onInput={(e) => setPw((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <IconButton label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </IconButton>
        </div>
        {j.wrong && (
          <div class="alert alert--warn" role="alert">
            That didn&rsquo;t match.{' '}
            {j.triesLeft !== null ? `${j.triesLeft} ${j.triesLeft === 1 ? 'try' : 'tries'} left before the code resets.` : ''}
          </div>
        )}
      </div>
      <Button variant="primary" class="screen-cta btn--lg" disabled={pw.trim().length < 4 || j.checking} onClick={submit}>
        {j.checking ? 'Checking…' : 'Unlock and connect'}
      </Button>
    </div>
  )
}
