import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { computeStats, fmtMoney, netsByCurrency, tradesToCsv } from '../lib/utils.js'
import { parseGrowwStatement } from '../lib/growwImport.js'
import {
  lockEnabled,
  enrollFingerprint,
  disableLock,
  platformAuthenticatorAvailable,
  createRecoveryCode,
} from '../lib/webauthn.js'

export default function Profile({ trades, addManyTrades, onReset, excel }) {
  const stats = computeStats(trades)
  const nets = netsByCurrency(trades)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [locked, setLocked] = useState(lockEnabled)
  const [bioAvailable, setBioAvailable] = useState(null)
  const [lockMsg, setLockMsg] = useState(null)
  const [recoveryCode, setRecoveryCode] = useState(null)
  const [syncMsg, setSyncMsg] = useState(null)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    platformAuthenticatorAvailable().then(setBioAvailable)
  }, [])

  const exportCsv = () => {
    const blob = new Blob([tradesToCsv(trades)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleLock = async () => {
    setLockMsg(null)
    setRecoveryCode(null)
    if (locked) {
      disableLock()
      setLocked(false)
      setLockMsg('Fingerprint lock disabled.')
      return
    }
    try {
      await enrollFingerprint()
      const code = await createRecoveryCode()
      setLocked(true)
      setRecoveryCode(code)
      setLockMsg('Lock enabled. Save this recovery code — it is the only fallback and will not be shown again:')
    } catch (e) {
      setLockMsg(e.name === 'NotAllowedError' ? 'Enrollment was cancelled.' : 'Could not enroll: ' + e.message)
    }
  }

  const syncNow = async () => {
    setSyncMsg(null)
    try {
      await excel.syncNow()
      setSyncMsg('Synced to ' + excel.fileName)
    } catch {
      setSyncMsg('Sync failed — check the file is not open in Excel.')
    }
  }

  const importGroww = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setImportMsg(null)
    try {
      const isXlsx = /\.xlsx?$/i.test(file.name)
      const content = isXlsx ? await file.arrayBuffer() : await file.text()
      const parsed = await parseGrowwStatement(content, file.name)
      if (!parsed.length) {
        setImportMsg('No trades found in that file — is it a Groww P&L statement?')
        return
      }
      const seen = new Set(trades.map((t) => `${t.ts}|${t.entry}|${t.exit}|${t.size}`))
      const fresh = []
      for (const t of parsed) {
        const key = `${t.ts}|${t.entry}|${t.exit}|${t.size}`
        if (seen.has(key)) continue
        seen.add(key)
        fresh.push(t)
      }
      if (fresh.length) addManyTrades(fresh)
      const skipped = parsed.length - fresh.length
      setImportMsg(
        skipped
          ? `${fresh.length} trade${fresh.length === 1 ? '' : 's'} imported, ${skipped} skipped (duplicates)`
          : `Imported ${fresh.length} trade${fresh.length === 1 ? '' : 's'}`
      )
    } catch (err) {
      console.error('Groww import failed', err)
      setImportMsg('Could not read that file. Export the P&L statement from Groww as .csv or .xlsx and try again.')
    }
  }

  return (
    <section className="page">
      <div>
        <h2 className="page-title">Profile</h2>
        <p className="page-subtitle">Your trader identity and data.</p>
      </div>

      <div className="card avatar-card">
        <div className="avatar">TJ</div>
        <div>
          <p className="profile-name">Trader</p>
          <p className="profile-sub">NIFTY 50 · XAUUSD · EURUSD</p>
        </div>
      </div>

      <div className="profile-stat-grid">
        {nets.map(([c, net]) => (
          <div key={c} className="card profile-stat">
            <span className="label">{c === 'INR' ? '₹ P&L' : '$ P&L'}</span>
            <span className={`stat-value num ${net >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(net, c)}</span>
          </div>
        ))}
        <div className="card profile-stat">
          <span className="label">Trades</span>
          <span className="stat-value num">{stats.count}</span>
        </div>
        <div className="card profile-stat">
          <span className="label">Win Rate</span>
          <span className="stat-value num">{stats.count ? stats.winRate.toFixed(1) + '%' : '—'}</span>
        </div>
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Excel Database</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!excel.supported ? (
            <div className="card" style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: '19px' }}>
              This browser can't write files directly. Use <strong>Chrome or Edge</strong> to keep the journal in
              a real .xlsx file on your device — CSV export below still works everywhere.
            </div>
          ) : excel.status === 'connected' ? (
            <>
              <div className="action-row" style={{ cursor: 'default' }}>
                <Icon name="table_view" />
                <span>
                  {excel.fileName}
                  <span className="action-sub">Every entry is saved to this file automatically</span>
                </span>
                <span className="spacer" />
                <span className="badge pos">LINKED</span>
              </div>
              <button className="action-row" onClick={syncNow}>
                <Icon name="sync" />
                <span>
                  Sync now
                  <span className="action-sub">Force-write all trades to the file</span>
                </span>
                <span className="spacer" />
                <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
              </button>
              <button className="action-row" onClick={excel.disconnectExcel}>
                <Icon name="link_off" />
                <span>
                  Disconnect file
                  <span className="action-sub">Keep using browser storage only</span>
                </span>
                <span className="spacer" />
                <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
              </button>
            </>
          ) : excel.status === 'needs-permission' ? (
            <button className="action-row" onClick={excel.grantExcelAccess}>
              <Icon name="lock_open" />
              <span>
                Reconnect {excel.fileName}
                <span className="action-sub">Grant access to your Excel database again</span>
              </span>
              <span className="spacer" />
              <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
            </button>
          ) : (
            <>
              <button className="action-row" onClick={excel.connectNewFile}>
                <Icon name="note_add" />
                <span>
                  Create Excel database
                  <span className="action-sub">Save a new trading-journal.xlsx and keep it in sync</span>
                </span>
                <span className="spacer" />
                <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
              </button>
              <button className="action-row" onClick={excel.connectExistingFile}>
                <Icon name="upload_file" />
                <span>
                  Connect existing .xlsx
                  <span className="action-sub">Load trades from a file and keep writing to it</span>
                </span>
                <span className="spacer" />
                <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
              </button>
            </>
          )}
          {excel.status === 'error' && <p className="entry-error" style={{ fontSize: 13 }}>{excel.error}</p>}
          {syncMsg && <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>{syncMsg}</p>}
        </div>
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Security</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="action-row" onClick={toggleLock} disabled={!locked && bioAvailable === false}>
            <Icon name="fingerprint" />
            <span>
              {locked ? 'Disable fingerprint lock' : 'Enable fingerprint lock'}
              <span className="action-sub">
                {locked
                  ? 'The journal currently requires your fingerprint to open'
                  : bioAvailable === false
                    ? 'No fingerprint sensor available on this device/browser'
                    : 'Require your fingerprint every time the journal opens'}
              </span>
            </span>
            <span className="spacer" />
            {locked && <span className="badge pos">ON</span>}
          </button>
          {lockMsg && <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>{lockMsg}</p>}
          {recoveryCode && (
            <div className="recovery-code num" style={{ textAlign: 'center' }}>{recoveryCode}</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Data</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="action-row" onClick={exportCsv}>
            <Icon name="download" />
            <span>
              Export trades to CSV
              <span className="action-sub">Download your full trade history</span>
            </span>
            <span className="spacer" />
            <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={importGroww}
          />
          <button className="action-row" onClick={() => fileRef.current.click()}>
            <Icon name="upload_file" />
            <span>
              Import Groww statement
              <span className="action-sub">Upload your P&amp;L statement (.csv or .xlsx) from Groww</span>
            </span>
            <span className="spacer" />
            <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
          </button>
          {importMsg && <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>{importMsg}</p>}
          {!confirmingReset ? (
            <button className="action-row danger" onClick={() => setConfirmingReset(true)}>
              <Icon name="restart_alt" />
              <span>
                Reset all data
                <span className="action-sub">Permanently deletes every trade from this browser</span>
              </span>
              <span className="spacer" />
              <Icon name="chevron_right" style={{ color: 'var(--tertiary)' }} />
            </button>
          ) : (
            <div className="card confirm-inline" style={{ justifyContent: 'space-between' }}>
              <span>Reset all trades? This cannot be undone.</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button
                  className="small-btn danger"
                  onClick={() => {
                    onReset()
                    setConfirmingReset(false)
                  }}
                >
                  RESET
                </button>
                <button className="small-btn" onClick={() => setConfirmingReset(false)}>CANCEL</button>
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="muted" style={{ textAlign: 'center', fontSize: 12, paddingBottom: 8 }}>
        Trading Journal · {excel.status === 'connected' ? `synced to ${excel.fileName}` : 'data stored locally in your browser'}
      </p>
    </section>
  )
}
