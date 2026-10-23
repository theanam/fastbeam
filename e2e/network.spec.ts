import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Two browser contexts on one machine share a public IP, so they land in the same discovery room via
 * the real Nostr relays and connect over WebRTC host candidates. These need internet access.
 */
test.describe.configure({ mode: 'serial' })

async function openPair(browser: Browser, name: string): Promise<{ a: Page; b: Page }> {
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 820 } })
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  for (const [ctx, n] of [
    [ctxA, `${name} A`],
    [ctxB, `${name} B`],
  ] as const) {
    await ctx.addInitScript((nm) => {
      localStorage.setItem('fastbeam:sink', JSON.stringify('blob'))
      localStorage.setItem('fastbeam:name', JSON.stringify(nm))
    }, n)
  }
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  return { a, b }
}

test('two tabs discover each other and move a file', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once')
  const { a, b } = await openPair(browser, 'Disco')
  await a.goto('/')
  await b.goto('/')

  await expect(a.getByRole('button', { name: /Send to Disco B/ })).toBeVisible({ timeout: 60_000 })
  await expect(b.getByRole('button', { name: /Send to Disco A/ })).toBeVisible({ timeout: 60_000 })

  // A sends a 3 MB file to B.
  await a.getByRole('button', { name: /Send to Disco B/ }).click()
  await a.locator('input[type=file]').nth(1).setInputFiles({
    name: 'hello.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(3 * 1024 * 1024, 7),
  })
  await a.getByRole('button', { name: /^Send 1 file/ }).click()

  const dlg = b.locator('dialog.incoming')
  await expect(dlg).toBeVisible({ timeout: 30_000 })
  await expect(dlg.getByText(/Disco A wants to send you a file/)).toBeVisible()
  // Verification codes match on both screens.
  const codeB = (await dlg.locator('.verify-code').textContent())?.trim()
  expect(codeB).toMatch(/^\d{3} \d{3}$/)
  const [download] = await Promise.all([
    b.waitForEvent('download', { timeout: 60_000 }),
    dlg.getByRole('button', { name: /^Accept/ }).click(),
  ])
  expect(download.suggestedFilename()).toBe('hello.bin')

  await expect(a.getByRole('heading', { name: /^Sent hello\.bin/ })).toBeVisible({ timeout: 60_000 })
  await expect(b.getByRole('heading', { name: /^Got hello\.bin/ })).toBeVisible({ timeout: 60_000 })

  // Text goes the other way with no sink involved.
  await b.getByRole('button', { name: 'Send back' }).click()
  await b.getByRole('tab', { name: 'Text or link' }).click()
  await b.getByLabel('Text or link').fill('https://example.com/')
  await b.getByRole('button', { name: 'Send text' }).click()
  const dlgA = a.locator('dialog.incoming')
  await expect(dlgA).toBeVisible({ timeout: 30_000 })
  await dlgA.getByRole('button', { name: /^Accept/ }).click()
  await expect(a.getByRole('button', { name: 'Open link' })).toBeVisible()
})

test('a device whose clock runs 45 s ahead is still found within seconds', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once')
  const { a, b } = await openPair(browser, 'Skew')
  // B's clock is ahead, like a Windows PC that has not synced in a while. Relays filter events by the
  // sender's timestamp against the listener's "since", so without the correction B missed every reply to
  // its first announces and met A only at Trystero's next one-minute announce.
  await b.addInitScript(() => {
    const real = Date.now.bind(Date)
    Date.now = () => real() + 45_000
  })
  await a.goto('/')
  await b.goto('/')
  await expect(a.getByRole('button', { name: /Send to Skew B/ })).toBeVisible({ timeout: 30_000 })
  await expect(b.getByRole('button', { name: /Send to Skew A/ })).toBeVisible({ timeout: 30_000 })
})

test('password-protected pairing by code', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once')
  const { a, b } = await openPair(browser, 'Lock')
  await a.goto('/')
  // Host: turn on the password in the full sheet.
  await a.getByRole('button', { name: 'Show QR' }).click()
  await a.getByRole('switch', { name: 'Protect with a password' }).click()
  const password = await a.locator('#host-pw').inputValue()
  expect(password).toMatch(/^[a-z]+-[a-z]+$/)
  const label = await a.locator('.bigcode').getAttribute('aria-label')
  const code = (label ?? '').replace('Code ', '').replace(/ /g, '')
  expect(code).toHaveLength(6)
  await expect(a.getByText('Never stored, never in the link or QR.')).toBeVisible({ timeout: 30_000 })

  // Joiner opens the link, gets asked for the password, gets it wrong once, then right.
  await b.goto(`/#${code}`)
  await expect(b.getByRole('heading', { name: /set a password/ })).toBeVisible({ timeout: 90_000 })
  await b.locator('#join-pw').fill('wrong-words')
  await b.getByRole('button', { name: 'Unlock and connect' }).click()
  await expect(b.getByRole('alert')).toContainText('That didn’t match', { timeout: 60_000 })
  await b.locator('#join-pw').fill(password)
  await b.getByRole('button', { name: 'Unlock and connect' }).click()
  await expect(b.getByRole('button', { name: /Send to Lock A.*paired/ })).toBeVisible({ timeout: 60_000 })
  // Host side: a fresh code replaced the used one, and the tile shows the lock.
  await expect(a.getByRole('button', { name: /Send to Lock B.*paired/ })).toBeVisible({ timeout: 30_000 })
  const label2 = await a.locator('.bigcode').getAttribute('aria-label')
  expect(label2).not.toBe(label)

  // A third device with the OLD link must not get in, with or without the password.
  const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await ctxC.addInitScript(() => localStorage.setItem('fastbeam:name', JSON.stringify('Lock C')))
  const c = await ctxC.newPage()
  await c.goto(`/#${code}`)
  await expect(c.getByRole('heading', { name: 'That code has already been used' })).toBeVisible({ timeout: 90_000 })
  // In this test all tabs share one public IP, so C may still meet A through same-network discovery;
  // what must never happen is a *paired* relationship from the stale link.
  await expect(c.getByRole('button', { name: /Send to Lock A.*paired/ })).toHaveCount(0)
  await expect(a.getByRole('button', { name: /Send to Lock C.*paired/ })).toHaveCount(0)
  await ctxC.close()
})
