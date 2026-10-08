import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * A folder picked on one tab is rebuilt inside the folder the receiver chose. The receiver's
 * showDirectoryPicker is backed by the origin-private file system, so the real File System Access
 * calls run. Needs internet (STUN + Nostr), like network.spec.
 */

async function openPair(browser: Browser, name: string): Promise<{ a: Page; b: Page }> {
  const pages: Page[] = []
  for (const [n, sink] of [
    [`${name} A`, 'blob'],
    [`${name} B`, 'fs'],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } })
    await ctx.addInitScript(
      ([nm, sk]) => {
        localStorage.setItem('fastbeam:sink', JSON.stringify(sk))
        localStorage.setItem('fastbeam:name', JSON.stringify(nm))
        const w = window as unknown as Record<string, unknown>
        w.showDirectoryPicker = () => navigator.storage.getDirectory()
      },
      [n, sink] as const,
    )
    pages.push(await ctx.newPage())
  }
  return { a: pages[0]!, b: pages[1]! }
}

/** Every file in the receiver's OPFS as "path: contents". */
function opfsTree(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    type Dir = FileSystemDirectoryHandle & { entries(): AsyncIterable<[string, FileSystemHandle]> }
    async function walk(dir: Dir, prefix: string): Promise<string[]> {
      const out: string[] = []
      for await (const [n, h] of dir.entries()) {
        if (h.kind === 'file') out.push(`${prefix}${n}: ${await (await (h as FileSystemFileHandle).getFile()).text()}`)
        else out.push(...(await walk(h as Dir, `${prefix}${n}/`)))
      }
      return out
    }
    return (await walk((await navigator.storage.getDirectory()) as Dir, '')).sort()
  })
}

test('a picked folder arrives with its structure', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once')
  const root = mkdtempSync(join(tmpdir(), 'fastbeam-folder-'))
  const files: Record<string, string> = {
    'trip/a.txt': 'top',
    'trip/photos/IMG.jpg': 'same',
    'trip/photos/day 2/IMG.jpg': 'same', // identical name, size and mtime in another subfolder
    'trip/notes/IMG.jpg': 'diff',
  }
  const when = new Date('2026-01-01T00:00:00Z')
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true })
    writeFileSync(join(root, p), body)
    utimesSync(join(root, p), when, when)
  }

  try {
    const { a, b } = await openPair(browser, 'Folder')
    await a.goto('/')
    await b.goto('/')
    await b.evaluate(async () => {
      const opfs = (await navigator.storage.getDirectory()) as FileSystemDirectoryHandle & { keys(): AsyncIterable<string> }
      for await (const k of opfs.keys()) await opfs.removeEntry(k, { recursive: true })
    })

    await expect(a.getByRole('button', { name: /Send to Folder B/ })).toBeVisible({ timeout: 60_000 })
    await a.getByRole('button', { name: /Send to Folder B/ }).click()
    // The Folder picker must really be in directory mode (Preact turns webkitdirectory="" into false).
    const folderInput = a.locator('input[type=file]').nth(2)
    expect(await folderInput.evaluate((i: HTMLInputElement) => i.webkitdirectory)).toBe(true)
    await folderInput.setInputFiles(join(root, 'trip'))
    // All four, although three share name, size and mtime.
    await expect(a.getByRole('button', { name: /^Send 4 files/ })).toBeVisible()
    await a.getByRole('button', { name: /^Send 4 files/ }).click()

    const dlg = b.locator('dialog.incoming')
    await expect(dlg).toBeVisible({ timeout: 30_000 })
    await dlg.getByRole('button', { name: /^Accept/ }).click()
    await expect(b.getByRole('heading', { name: /^Got / })).toBeVisible({ timeout: 60_000 })

    const tree = await opfsTree(b)
    info.annotations.push({ type: 'received', description: tree.join(' | ') })
    expect(tree).toEqual(['trip/a.txt: top', 'trip/notes/IMG.jpg: diff', 'trip/photos/IMG.jpg: same', 'trip/photos/day 2/IMG.jpg: same'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
