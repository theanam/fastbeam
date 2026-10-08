// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TEXT_MAX } from '../config'
import {
  decodeChunk,
  encodeChunk,
  formatBytes,
  inertBlob,
  inertType,
  isValidOffer,
  type OfferMessage,
  sanitizeFileName,
  sanitizeRelPath,
  singleUrl,
  verificationCode,
} from './protocol'

describe('chunk framing', () => {
  it('round-trips the file index and payload', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const frame = encodeChunk(7, data)
    expect(frame.byteLength).toBe(10)
    const out = decodeChunk(frame)
    expect(out?.fileIndex).toBe(7)
    expect(Array.from(out!.data)).toEqual([1, 2, 3, 4, 5])
  })
  it('rejects short or unknown frames', () => {
    expect(decodeChunk(new ArrayBuffer(3))).toBeNull()
    const bad = new Uint8Array([9, 0, 0, 0, 0, 1]).buffer
    expect(decodeChunk(bad)).toBeNull()
  })
})

describe('sanitizeFileName', () => {
  it('strips paths, control chars and leading dots', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFileName('C:\\Users\\x\\.hidden')).toBe('hidden')
    expect(sanitizeFileName('a\u0000b<c>.txt')).toBe('abc.txt')
    expect(sanitizeFileName('   ')).toBe('file')
  })
  it('keeps only safe folder segments from relPath', () => {
    expect(sanitizeRelPath('trip/photos/../IMG.jpg')).toEqual(['trip', 'photos'])
    expect(sanitizeRelPath('IMG.jpg')).toEqual([])
    expect(sanitizeRelPath(undefined)).toEqual([])
  })
})

describe('formatBytes', () => {
  it('uses decimal units like the designs', () => {
    expect(formatBytes(312_000)).toBe('312 KB')
    expect(formatBytes(4_200_000)).toBe('4.2 MB')
    expect(formatBytes(231_000_000)).toBe('231 MB')
    expect(formatBytes(2_000_000_000)).toBe('2.0 GB')
  })
})

describe('verificationCode', () => {
  it('is symmetric and six digits', async () => {
    const a = 'AA:BB:CC'
    const b = '11:22:33'
    const x = await verificationCode(a, b)
    expect(x).toMatch(/^\d{3} \d{3}$/)
    expect(await verificationCode(b, a)).toBe(x)
    expect(await verificationCode(a, 'FF:EE')).not.toBe(x)
  })
})

describe('singleUrl', () => {
  it('detects a lone http(s) URL', () => {
    expect(singleUrl(' https://fastbeam.app/#K7QX4M ')).toBe('https://fastbeam.app/#K7QX4M')
    expect(singleUrl('see https://example.com')).toBeNull()
    expect(singleUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('inertType', () => {
  it('allows types that cannot script our origin', () => {
    expect(inertType('application/pdf')).toBe('application/pdf')
    expect(inertType('Text/Plain; charset=latin1')).toBe('text/plain;charset=utf-8')
    expect(inertType('audio/mpeg')).toBe('audio/mpeg')
    expect(inertType('image/png')).toBe('image/png')
  })
  it('refuses anything that can run script or is unknown', () => {
    for (const t of ['text/html', 'application/xhtml+xml', 'image/svg+xml', 'text/xml', 'application/xml', 'application/octet-stream', ''])
      expect(inertType(t)).toBeNull()
  })
})

describe('inertBlob', () => {
  it('keeps the bytes and vetted type, and demotes anything that could script', async () => {
    const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' })
    const inert = inertBlob(svg, svg.type)
    expect(inert.type).toBe('application/octet-stream')
    expect(await inert.text()).toBe('<svg/>')
    expect(inertBlob(new Blob(['x'], { type: 'image/png' }), 'image/png').type).toBe('image/png')
  })
})

describe('isValidOffer', () => {
  const file = { fileId: 'a', name: 'a.txt', size: 3, mime: 'text/plain' }
  const offer = (extra: object): OfferMessage => ({ type: 'offer', transferId: 't', totalSize: 3, ...extra }) as OfferMessage

  it('accepts well-formed file and text offers', () => {
    expect(isValidOffer(offer({ files: [file] }))).toBe(true)
    expect(isValidOffer(offer({ files: [{ ...file, mime: '', relPath: 'dir/a.txt' }] }))).toBe(true)
    expect(isValidOffer(offer({ text: 'hello' }))).toBe(true)
  })
  it('rejects fields the sinks would choke on', () => {
    const { mime: _, ...noMime } = file
    for (const files of [[noMime], [{ ...file, mime: 1 }], [{ ...file, relPath: 5 }], [{ ...file, size: -1 }], [null], { 0: file, length: 1 }])
      expect(isValidOffer(offer({ files }))).toBe(false)
    expect(isValidOffer(offer({ files: [] }))).toBe(false)
    expect(isValidOffer(offer({ text: 'x'.repeat(TEXT_MAX + 1) }))).toBe(false)
    // The receiver treats any text as a text transfer, so files must not smuggle an unchecked one in.
    expect(isValidOffer(offer({ files: [file], text: 'x'.repeat(TEXT_MAX + 1) }))).toBe(false)
    expect(isValidOffer(offer({ files: [file], text: 'hi' }))).toBe(false)
    expect(isValidOffer(offer({ files: [file], totalSize: '3' }))).toBe(false)
  })
})
