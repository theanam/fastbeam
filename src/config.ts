/** Constants shared by discovery, pairing and transfer. Bump APP_SALT / PROTOCOL on breaking wire changes. */

export const APP_SALT = 'fastbeam/v1'
export const APP_ID = 'fastbeam.app'
export const PROTOCOL = 1
export const CANONICAL_ORIGIN = 'https://fastbeam.app'
export const REPO_URL = 'https://github.com/theanam/fastbeam'
export const ISSUES_URL = 'https://github.com/theanam/fastbeam/issues'
export const FEEDBACK_EMAIL = 'anam.ahmed.a@gmail.com'

/** Exactly two STUN servers and no TURN: fastbeam never relays traffic. */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

/**
 * Nostr relays used for signaling; two devices only find each other through a relay they both use.
 * Every relay listed is used (Trystero ignores RELAY_REDUNDANCY when given a list); leave undefined to
 * fall back to Trystero's pick of RELAY_REDUNDANCY relays.
 */
export const RELAY_URLS: string[] | undefined = [
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.net',
  'wss://nostr.data.haus',
  // Transition only: the two live relays of Trystero's hashed default, which builds before this list
  // still use. They let old and new clients meet until the old ones reload. Remove after Dec 2026.
  'wss://nostrcity-club.fly.dev',
  'wss://nostr.red5d.dev',
]
export const RELAY_REDUNDANCY = 4
/** How often the relay watchdog looks at the sockets. */
export const RELAY_CHECK_MS = 30_000
/**
 * Every announce (one per room per minute) draws an OK from the relay, so an open socket that has heard
 * nothing for this long is dead and is reconnected.
 */
export const RELAY_QUIET_MS = 150_000
/** Trystero's longest announce backoff for a relay that says "rate-limited:" (its maxRelayBackoffMs). */
export const RELAY_BACKOFF_MAX_MS = 900_000

/**
 * A clock off by at least this much is corrected for signaling. Smaller offsets are within the noise of
 * one measurement over the network, and the patched Trystero's 15 s look-back covers them anyway.
 */
export const CLOCK_CORRECT_MIN_MS = 2_000
/**
 * A clock measurement whose round trip took longer than this is too loose to trust. Its error is at most
 * half the round trip, which stays inside the patched Trystero's 15 s look-back.
 */
export const CLOCK_MAX_RTT_MS = 10_000
/**
 * Akamai's public time service: generated per request, never cached, millisecond precision, CORS for any
 * origin (dash.js uses it for the same job). When it cannot be reached (a network that blocks unfamiliar
 * hosts) signaling uses the device's own clock. Our server's Date header is deliberately not used: it comes
 * through GitHub Pages' CDN, and whether it is fresh depends on the CDN's configuration.
 */
export const CLOCK_TIME_URL = 'https://time.akamai.com/?iso&ms'
/** Give up on the time service after this long, so a host that drops packets costs little. */
export const CLOCK_TIME_TIMEOUT_MS = 4_000
/** How often the wall clock is compared with the monotonic one to notice a clock change or a sleep. */
export const CLOCK_CHECK_MS = 30_000
/** A measurement that fails is retried this many times, this far apart. */
export const CLOCK_RETRIES = 3
export const CLOCK_RETRY_MS = 15_000

/** CORS-enabled public IP lookup used only when STUN yields no reflexive candidate (UDP blocked). */
export const IP_LOOKUP_URL = 'https://api64.ipify.org?format=json'

/** Opt-in "advanced BDIX discovery": a tiny PHP page on a BDIX host that echoes the IP it sees us from. See server/bdix-ip.php. */
export const BDIX_IP_URL = 'https://bdix-discovery.fastbeam.app/'
export const BDIX_LOOKUP_MS = 1_500

/** Pairing codes never use 0, O, 1, I or L. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export const CHUNK_SIZE = 64 * 1024
export const CHUNK_HEADER = 5
export const BUFFER_HIGH = 4 * 1024 * 1024
export const BUFFER_LOW = 1 * 1024 * 1024
/** Bytes the sender may have in flight beyond the receiver's last acknowledged progress. */
export const SEND_WINDOW = 32 * 1024 * 1024
export const PROGRESS_EVERY = 1024 * 1024
export const TEXT_MAX = 64 * 1024

export const OFFER_TIMEOUT_MS = 60_000
export const PING_INTERVAL_MS = 5_000
/** No ping for this long marks a peer "reconnecting" (greyed, not removed). */
export const PEER_TIMEOUT_MS = 15_000
/** No traffic at all for this long closes the link; the peer then enters the grace period below. */
export const LINK_SILENCE_CLOSE_MS = 60_000
/** A peer whose last link closed stays listed as reconnecting for this long before it is removed. */
export const PEER_GRACE_MS = 90_000
/** How long ICE may sit in "disconnected" before we ask for an ICE restart. */
export const ICE_RESTART_AFTER_MS = 3_000
/** How long we hide a "disconnected" state from Trystero (and ourselves) before giving up on the link. */
export const DISCONNECT_MASK_MS = 30_000
export const STUN_PROBE_MS = 3_000
export const PAIR_TIMEOUT_MS = 20_000
export const PAIR_RETRY_MS = 10_000
/** After a join error, how long a channel has to open before the join is given up. */
export const JOIN_ERROR_GRACE_MS = 3_000
export const CODE_TTL_MS = 10 * 60_000
export const STILL_LOOKING_MS = 8_000
export const REDISCOVER_HIDDEN_MS = 60_000

export const SHARED_NETWORK_PEERS = 12
export const BLOB_WARN_BYTES = 1024 * 1024 * 1024

export const AUTH_MIN_INTERVAL_MS = 2_000
export const AUTH_MAX_FAILURES = 5
export const PASSWORD_MIN = 4
