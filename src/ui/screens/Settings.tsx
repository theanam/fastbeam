import { FEEDBACK_EMAIL, ISSUES_URL, REPO_URL } from '../../config'
import { probing, runDiscovery } from '../../net/discovery'
import { copyDiagnostics } from '../../state/diagnostics'
import { device } from '../../state/identity'
import { consoleOpen } from '../../state/log'
import { NAT_DETAIL, nat } from '../../state/network'
import { goBack } from '../../state/router'
import { deviceName, discoverable, NAME_MAX, setDeviceName, shuffleName, theme, type Theme } from '../../state/settings'
import { AppFrame, useIsDesktop } from '../components/AppFrame'
import { Button, IconButton, Segmented, Switch } from '../components/Controls'
import { NetworkBadge } from '../components/Header'
import { BackIcon, BugIcon, CopyIcon, ExternalIcon, GithubIcon, MailIcon, TerminalIcon } from '../components/Icons'

function ActionRow({ icon, title, sub, onClick }: { icon: preact.ComponentChildren; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" class="row row--link row--button" onClick={onClick}>
      <span class="row-icon">{icon}</span>
      <span class="row-text">
        <span class="row-title">{title}</span>
        <span class="row-sub">{sub}</span>
      </span>
    </button>
  )
}

function feedbackMailto(): string {
  const subject = encodeURIComponent('fastbeam feedback')
  const body = encodeURIComponent(`\n\n—\nfastbeam ${__APP_VERSION__} · ${device.platform} · ${device.browser}`)
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
}

function LinkRow({ href, icon, title, sub }: { href: string; icon: preact.ComponentChildren; title: string; sub: string }) {
  const external = href.startsWith('http')
  return (
    <a
      class="row row--link"
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span class="row-icon">{icon}</span>
      <span class="row-text">
        <span class="row-title">{title}</span>
        <span class="row-sub">{sub}</span>
      </span>
      <span class="row-ext muted">
        <ExternalIcon />
      </span>
    </a>
  )
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
      <div class="settings">
        <header class="settings-header">
          <IconButton label="Back" onClick={goBack}>
            <BackIcon />
          </IconButton>
          <h1 class="settings-title" style={{ margin: 0 }}>
            Settings
          </h1>
        </header>

        <section class="field">
          <label class="field-label" for="device-name">
            Device name
          </label>
          <div class="input-row">
            <input
              id="device-name"
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
            <Button variant="link" onClick={shuffleName}>
              Shuffle
            </Button>
          </div>
        </section>

        <section class="card card--list">
          <div class="row">
            <div class="row-text">
              <span class="row-title">Visible to nearby devices</span>
              <span class="row-sub">Codes still work when this is off</span>
            </div>
            <Switch checked={discoverable.value} onChange={(v) => (discoverable.value = v)} label="Visible to nearby devices" />
          </div>
          <div class="row row--stack">
            <span class="row-title">Theme</span>
            <Segmented options={THEMES} value={theme.value} onChange={(v) => (theme.value = v)} label="Theme" />
          </div>
        </section>

        <section class="card card--pad">
          <div class="netcheck-head">
            <span class="row-title">Network check</span>
            <NetworkBadge />
          </div>
          <p class="settings-note">{NAT_DETAIL[nat.value]}</p>
          <Button variant="link" disabled={probing.value} onClick={() => void runDiscovery()}>
            {probing.value ? 'Checking…' : 'Run again'}
          </Button>
        </section>

        <section class="settings-section">
          <h2>Help &amp; about</h2>
          <p class="settings-note">
            fastbeam sends files and text straight between two browsers. On the same Wi‑Fi, devices find each other on
            their own. Anywhere else, one shows a code and the other scans or types it. Nothing is uploaded anywhere.
          </p>
        </section>
        <section class="card card--list">
          <LinkRow href={ISSUES_URL} icon={<BugIcon />} title="Report a problem" sub="Open an issue on GitHub" />
          <LinkRow href={feedbackMailto()} icon={<MailIcon />} title="Send feedback" sub={FEEDBACK_EMAIL} />
          <LinkRow href={REPO_URL} icon={<GithubIcon size={20} />} title="Source code" sub="github.com/theanam/fastbeam" />
        </section>

        <section class="settings-section">
          <h2>Troubleshooting</h2>
          <p class="settings-note">
            If something misbehaves, copy the diagnostics and paste them into an issue or an email. They contain the
            last events (discovery, connections, transfers) and your device name, never your files.
          </p>
        </section>
        <section class="card card--list">
          <ActionRow icon={<CopyIcon />} title="Copy diagnostics" sub="Last 120 console lines plus a device summary" onClick={() => void copyDiagnostics(120)} />
          <ActionRow
            icon={<TerminalIcon size={20} />}
            title={consoleOpen.value ? 'Hide status console' : 'Show status console'}
            sub="Live log of everything fastbeam does"
            onClick={() => (consoleOpen.value = !consoleOpen.value)}
          />
        </section>

        <section class="settings-section">
          <h2>What leaves this device</h2>
          <p class="settings-note">
            Files and text go straight to the other device, encrypted. To find each other, devices post a scrambled network
            ID and connection details (which include your IP address) to public relays. Devices you connect to can see
            your IP address. No accounts. fastbeam.app counts page views with Google Analytics; your files, device names
            and the devices you talk to are never part of that.
          </p>
          <p class="settings-note">
            Pairing passwords are checked between the two devices and never sent anywhere. Known limit: a relay that sits
            between you can fail the check on purpose and then guess a short password offline, so pick a password you
            would not mind being guessed, or pair on the same Wi‑Fi.
          </p>
        </section>

        <footer class="settings-footer">
          <span>fastbeam {__APP_VERSION__}</span>
          <a href="https://fastbeam.app">fastbeam.app</a>
        </footer>
      </div>
    </AppFrame>
  )
}
