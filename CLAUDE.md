# fastbeam

Browser-only, peer-to-peer file and text sharing PWA. Static build on GitHub Pages at https://fastbeam.app. No backend, no TURN, no accounts.

## Source of truth
The handoff lives in `fastbeam-handoff/` (gitignored, local only). Read in this order:
1. `fastbeam-handoff/docs/spec-original.md`: architecture, discovery, transfer protocol (calls the app "Beam").
2. `fastbeam-handoff/docs/build-notes.md`: rename, tokens, UX rules, password pairing, per-screen behaviour. **Wins over the spec.**
3. `fastbeam-handoff/design/*.dc.html`: one mockup per screen; the visual reference. Build Preact components, don't copy the markup.

## Conventions
- Commits are authored as `Anam Ahmed <anam.ahmed.a@gmail.com>` (set repo-locally; do not use the global identity).
- Dev server: `npm run dev` on port **5179** (strictPort). Preview uses the same port.
- Work milestone by milestone (spec "Milestones and acceptance" as amended by build-notes §7). Plan, get an OK, build, ship to Pages, stop for two-device testing.
- Product name is always lowercase `fastbeam`. `APP_SALT = "fastbeam/v1"`, Trystero `appId: "fastbeam.app"`.
- Fonts are self-hosted via `@fontsource`; nothing is requested from Google or any third party at runtime.
- One opt-in exception: "advanced BDIX discovery" (off by default) fetches `BDIX_IP_URL` (our own PHP page, `server/bdix-ip.php`, on a BDIX host). Nothing is requested while it is off.

## Commands
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` (tsc strict), `npm test` (Vitest, jsdom)
- `npm run icons` regenerates `public/icons` from the mark (needs `@resvg/resvg-js`)
- `npm run check` runs typecheck, tests and build (what CI runs before deploying)

## Layout
```
src/
  main.tsx            fonts, CSS, theme + router init, SW registration, boot()
  boot.ts             startup: discovery, pairing links (#CODE), share-target pickup, drag/paste capture, wake lock
  app.tsx             screen priority: Sorry > Password > Connecting > Progress > Done > Settings/Home, plus overlays
  config.ts           salts, STUN list, limits, timeouts
  sw.ts               service worker: precache, streamed downloads (/fb-download/<id>), Share Target POST /share
  net/
    hash.ts           sha256, base32, base64url, roomId(kind, key)
    stunProbe.ts      public IPv4 / IPv6 prefix / NAT kind
    bdix.ts           opt-in lookup of the IP the BDIX host sees us from (extra `bdix` discovery room)
    signaling.ts      Signaling interface + Trystero (Nostr) adapter
    relays.ts         relay socket watchdog: reconnects "open" sockets that have gone silent, logs relay health
    clock.ts          measures the clock offset from Akamai's time service; the patched Trystero uses it
    peerLink.ts       negotiated data channel id 42: control JSON + binary frames, fingerprints
    session.ts        hello/ping, peer registry wiring, control routing to transfer manager
    discovery.ts      probe → rooms → join; re-discovery on online/connection/visibility
    pairing.ts        host codes (rotate, retire rooms), joiner state machine, timeouts → sorry
    pairAuth.ts       PBKDF2/HKDF/HMAC password handshake (+ .worker.ts), AuthLimiter
    qr.worker.ts      jsQR fallback for the scanner
    wordlist.ts       2,048 words for suggested passwords
  transfer/
    protocol.ts       messages, chunk framing, sanitising, formatting, verification code
    sender.ts         offer → stream files with backpressure + 32 MiB ack window
    receiver.ts       offer dialog state → sink pipeline → done
    manager.ts        one incoming + one outgoing at a time, busy/decline, wake lock, beforeunload
    sinks/            fsAccess (Chromium desktop) → swStream (Chrome Android, Firefox) → opfs (Safari/iOS and
                      anything with OPFS sync handles: private storage + disk-backed Save) → blob (last resort)
  media/
    thumbs.ts         requestThumbnail: on-screen queue, LRU of small object URLs (held ones never evicted),
                      icon for good after 2 strikes (a worker died on it, a video stalled); other transient
                      misses are not cached
    shrinkWorker.ts   the worker's client: silence watchdog, respawn, blames only the job the worker said it
                      `started`; after 3 deaths rests 60 s (icons, never a main-thread decode), or shrinks on
                      the main thread if no worker ever started a job
    thumb.worker.ts   EXIF preview or scaled decode → 128 px WebP, one decode at a time
    exifThumb.ts      finds the camera's embedded JPEG preview and orientation
    square.ts         drawSquare: the centred, upright square crop both threads draw
  state/              signals: storage, identity, settings, names, device, network, router, toast, peers, ui,
                      media (viewer + mediaItem: one ViewerItem per File / SavedFile)
  ui/                 tokens.css, base.css, components.css, screens.css, overlays.css
  ui/components/      BdixToggle (opt-in switch + info), Icons, Controls, Header, EditableName, Toasts, Sheet+Tabs, Tile, CodeBoxes, QrCode,
                      Scanner, IncomingDialog, TextReceivedDialog, PairPanel (desktop), MediaViewer, Thumb
  ui/sheets/          SendSheet (3), PairSheet (7 + 8)
  ui/screens/         Home (1, 2, 13), Settings (12), Pairing (9, 10, 11), Transfer (5, 6)
e2e/                  Playwright: smoke.spec (UI), network.spec (two tabs discover, transfer, password pairing)
scripts/icons.mjs     icon generator
patches/              patch-package (postinstall): Trystero Nostr uses the corrected clock, looks back 15 s
server/bdix-ip.php    the BDIX endpoint (echoes REMOTE_ADDR as JSON, CORS for fastbeam.app); uploaded by hand, not deployed by CI
public/               CNAME, icons, robots.txt
.github/workflows/    Pages deploy on push to main
```

## Status
All five milestones are built in one pass (user's call on Oct 7, 2026). Remaining known gaps:
- Resume after disconnect, remembered devices, and PAKE-based password auth are v2 (per spec).
- One incoming and one outgoing transfer at a time globally (spec said per peer); extras get `busy`.
- `auth-required` carries the host's device name so the Password screen can say who set it.
- The Nearby grid, Send sheet, Incoming dialog, Progress and Done screens were verified in headless Chrome
  through `e2e/network.spec.ts`; real two-device, cross-network runs are still worth doing.

## Testing
- `npm test`: unit tests incl. PBKDF2/HKDF/HMAC known-answer vectors, handshake, STUN parsing, framing.
- `npm run e2e`: Playwright against the dev server using local Chrome (`channel: 'chrome'`). The network spec
  needs internet (STUN + Nostr relays). `localStorage['fastbeam:sink']='"blob"'` forces the Blob sink so
  headless runs can complete a transfer without a file picker.

## Connection resilience (iOS Safari drops ICE briefly all the time)
- `net/patientPc.ts` is passed to Trystero as `rtcPolyfill`; it reports "connected" for up to 30 s while the
  real ICE state is "disconnected" so Trystero's 5 s teardown never fires. `PeerLink` watches the real state,
  asks for `restartIce()` after 3 s (only the side with the smaller device ID, to avoid glare) and gives up at 30 s.
- Missed pings (15 s) mark a peer `online: false` ("Reconnecting…", tile disabled) but keep the link; a link
  closes only on real ICE failure or 60 s of silence. When the last link closes the peer stays listed for 90 s
  and a fresh link merges back in. Sheets and dialogs therefore survive a blip.
- The first control frame in each direction is repeated every second until answered (`sendUntil`), because a
  negotiated channel is created independently per side and an early frame can arrive before the other side's
  channel exists.
- Chrome can deliver frames queued for a late-created negotiated channel *before* its "open" event. `PeerLink`
  therefore buffers control frames until the first `onControl` handler is attached and flushes them into it.
  Rule: the first handler attached to a fresh link must be the real waiter (`waitForControl`), never a debug tap.
- Trystero hands the *same* RTCPeerConnection to every room a peer shares with us (discovery v4/v6 and code
  rooms), and Chrome refuses a second negotiated channel with id 42 on one connection. `createPeerLink`
  therefore returns the existing link for a connection, and introductions are serialised per link with
  `runIntroduction`: discovery skips a link that is attached or being introduced; a code-room introduction
  waits for a running one, then runs its handshake over the attached link (`attachPeer` re-binds it and
  upgrades `paired`/`passwordVerified`). Never close a shared link on a refusal or cancel (`attachedTo`).
- When a link's channel dies, the link closes the whole RTCPeerConnection once no other link uses it and
  fires a synthetic `connectionstatechange`, so Trystero drops the peer and re-handshakes (PR #1). A
  self-tab keeps the transport (`keepTransport`) or the two tabs reconnect forever.
- The host's code expiry pauses while a joiner is connecting and resumes if they drop before pairing.
- Hellos are swapped with `exchangeHello` (discovery and the code-room host; the joiner, which also repeats
  `pair-join`, sends its last copy by hand): repeat until theirs arrives, then send ours once more.
  Without the last copy, a first hello dropped before the other channel existed left that side waiting 15 s
  and tearing the connection down.
- A joiner is connected to everyone in a code room (earlier joiners stay to keep their connection), so only a
  host message (`auth-required` / `pair-open` / `code-expired`) claims the join and stops the join timers.
  Trystero's "could not connect after exchanging SDP" is often spurious with shared connections; the joiner
  gives it a 3 s grace.
- Relays: `RELAY_URLS` in config is a hand-tested set. Trystero's default picks 4 relays by hashing the app id
  and two of ours died (Oct 2026). Trystero caches one socket per relay for the page's life and only reconnects
  on "close", so re-joining rooms does not fix a zombie socket. While discovery or a host code room is up,
  `relays.ts` closes open sockets silent for 150 s (every announce draws an OK; a "rate-limited:" reply allows
  15 min, Trystero's longest backoff). `reconnectRelays` closes all of them on online / network change and
  when rooms are rejoined after a long background spell or a dead link.
  Re-test with a pub/sub round trip and a burst before changing the list.
- Clock skew: relays forward an event only if its timestamp (sender's clock) is not older than the
  subscription's `since` (listener's clock). A device whose clock ran ahead (Windows drifts by tens of
  seconds) missed every reply to its first announces and met others only at Trystero's next one-minute
  announce. `clock.ts` measures the offset from Akamai's time service (`CLOCK_TIME_URL`: per request,
  millisecond ISO, CORS for any origin); when it is blocked or down the device's own clock is used. Our
  server's Date header is deliberately not a fallback: its freshness depends on the CDN's configuration.
  At 2 s or more it sets `globalThis.__fastbeamClockOffsetMs` and reconnects the relays. It measures again (with retries) when the wall clock moves against `performance.now()` (the clock
  was changed or the machine slept) and on "online", since a skewed clock tends to get snapped back while
  the tab is open; `patches/@trystero-p2p+nostr+*.patch`
  makes Trystero's `now()` use it and look back 15 s. Don't widen that look-back: primal, nos.lol and
  relay.nostr.net store ephemeral events and would replay old announcements. Upgrading Trystero means
  re-making the patch; `clock.test.ts` fails if it is missing.
- Status console (desktop header button, Ctrl/⌘ + `): `state/log.ts` ring buffer; `logger('scope')` in net,
  pairing, transfer and boot code. Use it first when discovery or pairing misbehaves.
- Browsers cannot dial a peer by IP: every new WebRTC connection needs an SDP exchange through signaling.
  ICE restart on the existing connection is the closest thing and keeps the direct LAN path.
- Dev server only: `fastbeam.killConnections()` / `fastbeam.dropLinks()` in the console simulate drops.

## Large files and the receive pipeline
- Sender reads with `file.stream()` in 64 KiB chunks; nothing is loaded whole. Backpressure: pause above 4 MiB
  `bufferedAmount`, plus a 32 MiB window on receiver acks (`progress` every 1 MiB written).
- Receiver sink order: File System Access → service-worker stream → OPFS → Blob. Only Blob holds the file in
  memory. OPFS writes in a worker with sync access handles and hands back a disk-backed `File` for Save.
- The service worker closes a download stream the moment the last chunk is enqueued; it must never wait for
  another `pull`, because browsers stop pulling once Content-Length is reached (this was the 98–99 % stall).
- The sender's "finishing" phase waits for the receiver's final ack as long as acks keep arriving, with a
  120 s no-progress cap; the UI shows "finishing" and explains it is waiting on the other side's disk.
- `fastbeam:sink` in localStorage forces a sink for tests; `scratchpad/shots/sinks.mjs` exercised opfs and sw.

## Trystero notes (verified against 0.26.0)
- `getPeers()` returns `{ [peerId]: RTCPeerConnection }`; Trystero opens one non-negotiated channel labelled `"data"`, so a negotiated channel with `id: 42` is free.
- `rtcConfig.iceServers` replaces Trystero's default STUN list entirely.
- `onJoinError` fires when WebRTC cannot connect (useful for the sorry screen); `onPeerHandshake` exists but pending peers are not in `getPeers()`, so the password handshake runs on our own channel as build-notes §4 describes.
