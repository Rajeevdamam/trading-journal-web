// Fingerprint / biometric lock using WebAuthn platform authenticators
// (Touch ID, Windows Hello, Android fingerprint). The credential never
// leaves the device; we store only its id so we can ask the OS to verify
// the same enrolled user on each unlock.

const CRED_KEY = 'trading-journal.lock.credentialId'
const RECOVERY_KEY = 'trading-journal.lock.recoveryHash'

export function biometricsSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials
}

export async function platformAuthenticatorAvailable() {
  if (!biometricsSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function lockEnabled() {
  return !!localStorage.getItem(CRED_KEY)
}

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

function challenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

export async function enrollFingerprint() {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'Trading Journal', id: location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'trader',
        displayName: 'Trader',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })
  localStorage.setItem(CRED_KEY, toBase64(credential.rawId))
}

export async function verifyFingerprint() {
  const stored = localStorage.getItem(CRED_KEY)
  if (!stored) throw new Error('No fingerprint enrolled')
  await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      allowCredentials: [{ type: 'public-key', id: fromBase64(stored) }],
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return true
}

export function disableLock() {
  localStorage.removeItem(CRED_KEY)
  localStorage.removeItem(RECOVERY_KEY)
}

// ---- Recovery code fallback ----
// Generated once at enrollment; only its SHA-256 hash is stored, so the
// plain code exists nowhere but wherever the user wrote it down.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizeCode(code) {
  return code.toUpperCase().replace(/[^A-Z2-9]/g, '')
}

export async function createRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  const code = `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}`
  localStorage.setItem(RECOVERY_KEY, await sha256Hex(normalizeCode(code)))
  return code
}

export function hasRecoveryCode() {
  return !!localStorage.getItem(RECOVERY_KEY)
}

export async function verifyRecoveryCode(input) {
  const stored = localStorage.getItem(RECOVERY_KEY)
  if (!stored) return false
  return (await sha256Hex(normalizeCode(input))) === stored
}
