import QR from 'qrcode'
import { useEffect, useState } from 'preact/hooks'
import { Mark } from './Icons'

/** QR at error level H with the mark knocked out of the centre (≈ 4% of the area, well inside H's 30%). */
export function QrCode({ value, size = 196 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string>('')
  useEffect(() => {
    let alive = true
    QR.toString(value, { type: 'svg', errorCorrectionLevel: 'H', margin: 0, color: { dark: '#0F1C1E', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [value])
  return (
    <div
      class="relative box-content rounded-xl bg-white p-2.5"
      style={{ width: size, height: size }}
      role="img"
      aria-label="QR code for the fastbeam pairing link"
    >
      {/* The SVG is generated locally from our own URL, never from remote content. */}
      <div class="size-full [&_svg]:block [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div class="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[10px] bg-white">
        <Mark size={32} spark={false} />
      </div>
    </div>
  )
}
