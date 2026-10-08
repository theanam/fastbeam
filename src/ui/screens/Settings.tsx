import { FEEDBACK_EMAIL, ISSUES_URL, REPO_URL } from '../../config'
import { probing, runDiscovery } from '../../net/discovery'
import { copyDiagnostics } from '../../state/diagnostics'
import { device } from '../../state/identity'
import { consoleOpen } from '../../state/log'
import { NAT_DETAIL, nat } from '../../state/network'
import { goBack } from '../../state/router'
import { deviceName, discoverable, NAME_MAX, setDeviceName, shuffleName, theme, type Theme } from '../../state/settings'
import { AppFrame } from '../components/AppFrame'
import { useIsDesktop } from '../useIsDesktop'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { NetworkBadge } from '../components/NetworkBadge'
import { BackIcon, BugIcon, CopyIcon, GithubIcon, MailIcon, TerminalIcon } from '../components/Icons'
import { ActionRow } from '../components/ActionRow'
import { LinkRow } from '../components/LinkRow'
import { cardList, cardPad, cx, field, fieldLabel, inputRow, plainInput, row, rowSub, rowText, rowTitle } from '../classes'

const page = cx(
  'mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4.5 px-5',
  'pt-[calc(8px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]',
  'desk:m-0 desk:px-10 desk:pt-9 desk:pb-10',
)
const section = 'flex flex-col gap-2 px-1'
const sectionTitle = 'm-0 text-14 font-bold'
const note = 'text-14 leading-normal text-body'

function feedbackMailto(): string {
  const subject = encodeURIComponent('fastbeam feedback')
  const body = encodeURIComponent(`\n\n—\nfastbeam ${__APP_VERSION__} · ${device.platform} · ${device.browser}`)
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
}

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** Screen 12. */
export function Settings() {
  const commitName = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement
    setDeviceName(el.value)
    el.value = deviceName.value
  }

  const desktop = useIsDesktop()

  return (
    <AppFrame desktop={desktop}>
      <div class={page}>
        <header class="-ml-3 flex items-center gap-1">
          <IconButton label="Back" onClick={goBack}>
            <BackIcon />
          </IconButton>
          <h1 class="m-0 font-display text-22 font-bold tracking-title desk:text-30 desk:tracking-display">
            Settings
          </h1>
        </header>

        <section class={field}>
          <label class={fieldLabel} for="device-name">
            Device name
          </label>
          <div class={inputRow}>
            <input
              id="device-name"
              class={plainInput}
              type="text"
              value={deviceName.value}
              maxLength={NAME_MAX}
              autocomplete="off"
              autocapitalize="words"
              enterkeyhint="done"
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
              }}
            />
            <Button variant="link" size="md" onClick={shuffleName}>
              Shuffle
            </Button>
          </div>
        </section>

        <section class={cardList}>
          <div class={row}>
            <div class={rowText}>
              <span class={rowTitle}>Visible to nearby devices</span>
              <span class={rowSub}>Codes still work when this is off</span>
            </div>
            <Switch checked={discoverable.value} onChange={(v) => (discoverable.value = v)} label="Visible to nearby devices" />
          </div>
          <div class="flex min-h-16 flex-col items-stretch gap-2.5 border-b border-line-soft py-3.5 last:border-b-0">
            <span class={rowTitle}>Theme</span>
            <Segmented options={THEMES} value={theme.value} onChange={(v) => (theme.value = v)} label="Theme" />
          </div>
        </section>

        <section class={cardPad}>
          <div
            class={cx(
              'flex items-center justify-between gap-3',
              '[&>[role=status]]:h-7 [&>[role=status]]:px-2.5 [&>[role=status]]:font-bold',
            )}
          >
            <span class={rowTitle}>Network check</span>
            <NetworkBadge />
          </div>
          <p class={note}>{NAT_DETAIL[nat.value]}</p>
          <Button variant="link" disabled={probing.value} onClick={() => void runDiscovery()}>
            {probing.value ? 'Checking…' : 'Run again'}
          </Button>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Help &amp; about</h2>
          <p class={note}>
            fastbeam sends files and text straight between two browsers. On the same Wi‑Fi, devices find each other on
            their own. Anywhere else, one shows a code and the other scans or types it. Nothing is uploaded anywhere.
          </p>
        </section>
        <section class={cardList}>
          <LinkRow href={ISSUES_URL} icon={<BugIcon />} title="Report a problem" sub="Open an issue on GitHub" />
          <LinkRow href={feedbackMailto()} icon={<MailIcon />} title="Send feedback" sub={FEEDBACK_EMAIL} />
          <LinkRow href={REPO_URL} icon={<GithubIcon size={20} />} title="Source code" sub="github.com/theanam/fastbeam" />
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Troubleshooting</h2>
          <p class={note}>
            If something misbehaves, copy the diagnostics and paste them into an issue or an email. They contain the
            last events (discovery, connections, transfers) and your device name, never your files.
          </p>
        </section>
        <section class={cardList}>
          <ActionRow icon={<CopyIcon />} title="Copy diagnostics" sub="Last 120 console lines plus a device summary" onClick={() => void copyDiagnostics(120)} />
          <ActionRow
            icon={<TerminalIcon size={20} />}
            title={consoleOpen.value ? 'Hide status console' : 'Show status console'}
            sub="Live log of everything fastbeam does"
            onClick={() => (consoleOpen.value = !consoleOpen.value)}
          />
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>What leaves this device</h2>
          <p class={note}>
            Files and text go straight to the other device, encrypted. To find each other, devices post a scrambled network
            ID and connection details (which include your IP address) to public relays. Devices you connect to can see
            your IP address. No accounts. fastbeam.app counts page views with Google Analytics; your files, device names
            and the devices you talk to are never part of that.
          </p>
          <p class={note}>
            Pairing passwords are checked between the two devices and never sent anywhere. Known limit: a relay that sits
            between you can fail the check on purpose and then guess a short password offline, so pick a password you
            would not mind being guessed, or pair on the same Wi‑Fi.
          </p>
        </section>

        <footer class="mt-auto flex justify-between gap-3 text-13 text-muted">
          <span>fastbeam {__APP_VERSION__}</span>
          <a href="https://fastbeam.app">fastbeam.app</a>
        </footer>
      </div>
    </AppFrame>
  )
}
