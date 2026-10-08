import { afterEach, describe, expect, it } from 'vitest'
import type { FileMeta } from '../protocol'
import { FsAccessSink } from './fsAccess'

/** In-memory stand-in for a FileSystemDirectoryHandle, strict like Chrome: no separators, no "." or "..". */
class FakeDir {
  readonly dirs = new Map<string, FakeDir>()
  readonly files = new Map<string, Uint8Array[]>()

  private check(name: string): void {
    if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) throw new TypeError(`invalid name: ${JSON.stringify(name)}`)
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FakeDir> {
    this.check(name)
    if (this.files.has(name)) throw new DOMException('is a file', 'TypeMismatchError')
    let d = this.dirs.get(name)
    if (!d) {
      if (!opts?.create) throw new DOMException('missing', 'NotFoundError')
      d = new FakeDir()
      this.dirs.set(name, d)
    }
    return d
  }

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    this.check(name)
    if (this.dirs.has(name)) throw new DOMException('is a directory', 'TypeMismatchError')
    if (!this.files.has(name)) {
      if (!opts?.create) throw new DOMException('missing', 'NotFoundError')
      this.files.set(name, [])
    }
    const parts = this.files.get(name)!
    return {
      name,
      createWritable: async () => ({
        write: async (d: Uint8Array) => void parts.push(d.slice()),
        close: async () => {},
        abort: async () => {},
      }),
      getFile: async () => new File(parts as BlobPart[], name),
    }
  }

  /** Every file as "dir/sub/name". */
  tree(prefix = ''): string[] {
    return [
      ...[...this.files.keys()].map((f) => prefix + f),
      ...[...this.dirs].flatMap(([n, d]) => d.tree(`${prefix}${n}/`)),
    ].sort()
  }
}

const w = window as unknown as Record<string, unknown>
afterEach(() => {
  delete w.showDirectoryPicker
  delete w.showSaveFilePicker
})

let id = 0
const meta = (name: string, relPath?: string): FileMeta => ({
  fileId: String(id++),
  name,
  size: 1,
  mime: 'text/plain',
  ...(relPath === undefined ? {} : { relPath }),
})

/** Receive `files` into a fresh fake folder, one byte each, the way IncomingTransfer drives a sink. */
async function receive(files: FileMeta[], root = new FakeDir()): Promise<FakeDir> {
  w.showDirectoryPicker = async () => root
  w.showSaveFilePicker = async () => {
    throw new Error('multi-file transfers must use the folder picker')
  }
  const sink = new FsAccessSink()
  await sink.prepare(files)
  for (let i = 0; i < files.length; i++) {
    await sink.startFile(i)
    await sink.write(i, new Uint8Array([i]))
    await sink.endFile(i)
  }
  await sink.finish()
  return root
}

describe('FsAccessSink folders', () => {
  it('recreates the sender’s folder structure', async () => {
    const root = await receive([
      meta('a.txt', 'trip/a.txt'),
      meta('b.jpg', 'trip/photos/b.jpg'),
      meta('c.jpg', 'trip/photos/day 2/c.jpg'),
      meta('loose.txt'),
    ])
    expect(root.tree()).toEqual(['loose.txt', 'trip/a.txt', 'trip/photos/b.jpg', 'trip/photos/day 2/c.jpg'])
  })

  it('keeps same-named files in different folders apart', async () => {
    const root = await receive([meta('IMG.jpg', 'x/a/IMG.jpg'), meta('IMG.jpg', 'x/b/IMG.jpg')])
    expect(root.tree()).toEqual(['x/a/IMG.jpg', 'x/b/IMG.jpg'])
  })

  it('renames instead of overwriting, including a folder sent twice', async () => {
    const root = new FakeDir()
    await receive([meta('a.txt', 'trip/a.txt'), meta('a.txt', 'trip/a.txt')], root)
    await receive([meta('a.txt', 'trip/a.txt'), meta('README', 'trip/README')], root)
    await receive([meta('README', 'trip/README'), meta('z', 'z')], root)
    expect(root.tree()).toEqual(['trip/README', 'trip/README (2)', 'trip/a (2).txt', 'trip/a (3).txt', 'trip/a.txt', 'z'])
  })

  it('never writes outside the chosen folder, whatever relPath says', async () => {
    const root = await receive([
      meta('1.txt', '../../etc/1.txt'),
      meta('2.txt', '..\\..\\Windows\\2.txt'),
      meta('3.txt', '/abs/./3.txt'),
      meta('4.txt', 'C:\\Users\\x\\4.txt'),
      meta('5.txt', 'a//b/../c/5.txt'),
      meta('6.txt', '.hidden/...dots/6.txt'),
      meta('7.txt', 'nul\u0000l/<bad>:"|?*/7.txt'),
      meta('../../8.txt', 'evil/../../8.txt'),
    ])
    // ".." is dropped, not resolved, so nothing climbs out; drive letters and leading slashes become plain folders.
    expect(root.tree()).toEqual([
      'C/Users/x/4.txt',
      'Windows/2.txt',
      'a/b/c/5.txt',
      'abs/3.txt',
      'etc/1.txt',
      'evil/8.txt',
      'hidden/dots/6.txt',
      'null/bad/7.txt',
    ])
  })

  it('very deep or very long paths', async () => {
    const deep = await receive([meta('a.txt', `${'d/'.repeat(500)}a.txt`), meta('b.txt', `${'x'.repeat(1000)}/b.txt`)])
    expect(deep.tree()).toHaveLength(2)
  })

  it('drops the folder for a single file and uses the save picker', async () => {
    const one = new FakeDir()
    w.showSaveFilePicker = async ({ suggestedName }: { suggestedName: string }) => one.getFileHandle(suggestedName, { create: true })
    w.showDirectoryPicker = async () => {
      throw new Error('single files use the save picker')
    }
    const sink = new FsAccessSink()
    await sink.prepare([meta('a.txt', 'trip/a.txt')])
    await sink.startFile(0)
    await sink.endFile(0)
    expect(one.tree()).toEqual(['a.txt'])
  })
})
