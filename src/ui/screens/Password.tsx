import { useState } from 'preact/hooks'
import { cancelJoin, formatCode, joining, submitJoinPassword } from '../../net/pairing'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { BackIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon } from '../components/Icons'
import { alertWarn, codechip, cx, field, inputRow, inputRowWarn, screen, screenCopy, screenTitle } from '../classes'

/** A mono input with the row's 17px semibold text. */
const pwInput =
  'h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-17 font-semibold text-ink outline-none placeholder:font-ui placeholder:font-medium placeholder:tracking-normal placeholder:text-muted'

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
    <div class={screen}>
      <header class="-ml-3 flex min-h-11 items-center justify-start gap-2">
        <IconButton label="Back" onClick={cancelJoin}>
          <BackIcon />
        </IconButton>
        <span class={codechip}>{formatCode(j.code)}</span>
      </header>
      <div class="flex flex-col items-center gap-4 pt-6 text-center">
        <span class="inline-flex size-22 items-center justify-center rounded-[28px] bg-[#0f1c1e] text-[#4dd0cc]">
          <LockKeyholeIcon />
        </span>
        <h1 class={screenTitle}>{j.hostName ?? 'The other device'} set a password</h1>
        <p class={screenCopy}>Ask them for it. It&rsquo;s checked on this device and never sent over the internet.</p>
      </div>
      <div class={field}>
        <label class="text-14 font-semibold text-ink" for="join-pw">
          Password
        </label>
        <div class={cx(inputRow.replace('h-13', 'h-14'), j.wrong && inputRowWarn)}>
          <input
            id="join-pw"
            class={pwInput}
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
          <div class={alertWarn} role="alert">
            That didn&rsquo;t match.{' '}
            {j.triesLeft !== null ? `${j.triesLeft} ${j.triesLeft === 1 ? 'try' : 'tries'} left before the code resets.` : ''}
          </div>
        )}
      </div>
      <Button variant="primary" size="lg" class="mt-auto" disabled={pw.trim().length < 4 || j.checking} onClick={submit}>
        {j.checking ? 'Checking…' : 'Unlock and connect'}
      </Button>
    </div>
  )
}
