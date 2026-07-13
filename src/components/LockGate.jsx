import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import {
  biometricsSupported,
  platformAuthenticatorAvailable,
  lockEnabled,
  enrollFingerprint,
  verifyFingerprint,
  createRecoveryCode,
  hasRecoveryCode,
  verifyRecoveryCode,
} from '../lib/webauthn.js'

// Gates the whole app: nothing renders until the OS fingerprint prompt
// succeeds (when a lock is enrolled). First run offers enrollment; a
// one-time recovery code is the only fallback if the sensor is unavailable.
export default function LockGate({ children }) {
  const [state, setState] = useState(() => (lockEnabled() ? 'locked' : 'welcome'))
  const [available, setAvailable] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(null)
  const [recoveryInput, setRecoveryInput] = useState('')

  useEffect(() => {
    platformAuthenticatorAvailable().then(setAvailable)
  }, [])

  const unlock = async () => {
    setBusy(true)
    setError(null)
    try {
      await verifyFingerprint()
      setState('open')
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Fingerprint not recognised or cancelled. Try again.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  const enroll = async () => {
    setBusy(true)
    setError(null)
    try {
      await enrollFingerprint()
      const code = await createRecoveryCode()
      setRecoveryCode(code)
      setState('show-code')
    } catch (e) {
      setError(
        e.name === 'NotAllowedError'
          ? 'Enrollment was cancelled.'
          : 'Could not enroll a fingerprint on this device: ' + e.message
      )
    } finally {
      setBusy(false)
    }
  }

  const tryRecovery = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (await verifyRecoveryCode(recoveryInput)) {
        setState('open')
      } else {
        setError('That recovery code is not correct.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (state === 'open') return children

  return (
    <div className="lock-screen">
      <div className="card lock-card">
        <img className="brand-logo lock-logo" src="/pwa-192.png" alt="" aria-hidden="true" />
        <h1 className="brand-title" style={{ fontSize: 24 }}>Trading Journal</h1>

        {state === 'locked' && (
          <>
            <p className="muted lock-text">This journal is locked. Verify your fingerprint to continue.</p>
            <button className="cta-btn lock-btn" onClick={unlock} disabled={busy}>
              <Icon name="fingerprint" size={22} />
              {busy ? 'Waiting for fingerprint…' : 'Unlock with fingerprint'}
            </button>
            {hasRecoveryCode() && (
              <button className="link-btn" style={{ marginTop: 14 }} onClick={() => { setError(null); setState('recovery') }}>
                CAN'T USE FINGERPRINT? USE RECOVERY CODE
              </button>
            )}
          </>
        )}

        {state === 'recovery' && (
          <form onSubmit={tryRecovery} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="muted lock-text">Enter the recovery code you saved when you enabled the lock.</p>
            <input
              className="text-input big"
              style={{ textAlign: 'center', letterSpacing: '0.1em' }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={23}
              autoFocus
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
            />
            <button className="cta-btn lock-btn" type="submit" disabled={busy || recoveryInput.length < 16}>
              <Icon name="key" size={20} /> Unlock with recovery code
            </button>
            <button className="link-btn" type="button" onClick={() => setState('locked')}>
              BACK TO FINGERPRINT
            </button>
          </form>
        )}

        {state === 'show-code' && (
          <>
            <p className="muted lock-text">
              Fingerprint lock is on. This is your <strong>recovery code</strong> — the only way in if your
              fingerprint ever stops working. Write it down somewhere safe; it will not be shown again.
            </p>
            <div className="recovery-code num">{recoveryCode}</div>
            <button className="cta-btn lock-btn" onClick={() => { setRecoveryCode(null); setState('open') }}>
              <Icon name="check" size={20} /> I've saved my recovery code
            </button>
          </>
        )}

        {state === 'welcome' && (
          <>
            <p className="muted lock-text">
              Protect your journal so only you can open it. Uses your device's fingerprint / Face&nbsp;ID —
              nothing is sent anywhere.
            </p>
            {available === false && (
              <p className="entry-error" style={{ fontSize: 13 }}>
                This browser/device has no fingerprint sensor available. You can enable the lock later
                from Profile on a device that has one.
              </p>
            )}
            <button className="cta-btn lock-btn" onClick={enroll} disabled={busy || available === false}>
              <Icon name="fingerprint" size={22} />
              {busy ? 'Waiting for fingerprint…' : 'Enable fingerprint lock'}
            </button>
            <button className="link-btn" style={{ marginTop: 14 }} onClick={() => setState('open')}>
              CONTINUE WITHOUT LOCK
            </button>
          </>
        )}

        {error && <p className="entry-error" style={{ marginTop: 14, fontSize: 13 }}>{error}</p>}
      </div>
      <p className="muted lock-foot">
        {biometricsSupported() ? 'Secured with your device biometrics (WebAuthn)' : 'Biometrics are not supported in this browser'}
      </p>
    </div>
  )
}
