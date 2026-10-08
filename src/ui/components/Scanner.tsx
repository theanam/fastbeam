import { useEffect, useRef, useState } from 'preact/hooks'
import { codeFromText } from '../../net/pairing'
import { IconButton } from './IconButton'
import { TorchIcon } from './Icons'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

type ScannerState = 'starting' | 'on' | 'denied' | 'unavailable'

/**
 * Rear-camera QR scanner. Uses BarcodeDetector where present, otherwise jsQR in a worker.
 * Accepts only fastbeam pairing links (or links to this origin while developing).
 */
export function Scanner({ onCode, paused = false }: { onCode: (code: string) => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScannerState>('starting')
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let worker: Worker | null = null
    let busy = false
    let stopped = false
    const canvas = document.createElement('canvas')

    const found = (raw: string) => {
      const code = codeFromText(raw)
      if (code && !pausedRef.current) onCodeRef.current(code)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch {
        setState('denied')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const v = video.current
      if (!v) return
      v.srcObject = stream
      await v.play().catch(() => {})
      setState('on')
      const track = stream.getVideoTracks()[0] ?? null
      trackRef.current = track
      const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
      setTorchAvailable(!!caps.torch)

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      let detector: BarcodeDetectorLike | null = null
      if (Detector) {
        try {
          const formats = (await Detector.getSupportedFormats?.()) ?? ['qr_code']
          if (formats.includes('qr_code')) detector = new Detector({ formats: ['qr_code'] })
        } catch {
          detector = null
        }
      }
      if (!detector) {
        worker = new Worker(new URL('../../net/qr.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e: MessageEvent<{ text: string | null }>) => {
          busy = false
          if (e.data.text) found(e.data.text)
        }
      }

      timer = window.setInterval(() => {
        if (stopped || busy || pausedRef.current || v.readyState < 2) return
        if (detector) {
          busy = true
          detector
            .detect(v)
            .then((codes) => {
              busy = false
              const hit = codes.find((c) => c.rawValue)
              if (hit) found(hit.rawValue)
            })
            .catch(() => {
              busy = false
            })
        } else if (worker) {
          const scale = Math.min(1, 640 / Math.max(v.videoWidth, 1))
          const w = Math.max(1, Math.round(v.videoWidth * scale))
          const h = Math.max(1, Math.round(v.videoHeight * scale))
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(v, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          busy = true
          worker.postMessage({ data: img.data.buffer, width: w, height: h }, [img.data.buffer])
        }
      }, 200)
    }

    void start()
    return () => {
      stopped = true
      window.clearInterval(timer)
      worker?.terminate()
      stream?.getTracks().forEach((t) => t.stop())
      trackRef.current = null
    }
  }, [])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      /* torch not switchable */
    }
  }

  if (state === 'denied' || state === 'unavailable') {
    return (
      <div class="relative flex-none overflow-hidden rounded-[16px] bg-tint p-4 text-15 leading-[1.45] text-link" role="note">
        {state === 'denied'
          ? 'Camera access is off. Type the code below, or scan the QR with your camera app.'
          : 'No camera here. Type the code below, or open the link on this device.'}
      </div>
    )
  }

  return (
    <section
      class="relative h-[300px] flex-none overflow-hidden rounded-[24px] bg-[#0f1c1e] text-[#e4efee]"
      aria-label="QR scanner">
      <video ref={video} class="absolute inset-0 size-full object-cover" playsInline muted autoPlay />
      <div class="absolute top-1/2 left-1/2 size-[200px] -translate-x-1/2 -translate-y-[54%]" aria-hidden="true">
        <i class="absolute size-9 border-solid border-[#4dd0cc] top-0 left-0 rounded-tl-[14px] border-t-4 border-l-4" />
        <i class="absolute size-9 border-solid border-[#4dd0cc] top-0 right-0 rounded-tr-[14px] border-t-4 border-r-4" />
        <i class="absolute size-9 border-solid border-[#4dd0cc] bottom-0 left-0 rounded-bl-[14px] border-b-4 border-l-4" />
        <i class="absolute size-9 border-solid border-[#4dd0cc] right-0 bottom-0 rounded-br-[14px] border-r-4 border-b-4" />
        <i class="absolute top-1/2 right-3 left-3 h-0.5 bg-[#4dd0cc] shadow-[0_0_12px_#4dd0cc] motion-safe:animate-[fb-scan_2.6s_ease-in-out_infinite]" />
      </div>
      <div class="absolute right-0 bottom-[18px] left-0 text-center text-15 font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
        {state === 'starting' ? 'Starting the camera…' : 'Point at the QR on the other screen'}
      </div>
      {torchAvailable && (
        <IconButton
          label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
          tone="inherit"
          class="absolute! top-2.5 right-2.5 text-[#e4efee] before:rounded-full! before:bg-[rgba(228,239,238,0.14)]! hover:before:bg-chip! active:before:bg-chip!"
          onClick={toggleTorch}
        >
          <TorchIcon />
        </IconButton>
      )}
    </section>
  )
}
