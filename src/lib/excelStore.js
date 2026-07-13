import { pnl } from './utils.js'

// xlsx is ~800 kB minified — load it lazily so app startup stays fast
const loadXLSX = () => import('xlsx')

export const excelSupported =
  typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window

const SHEET = 'Trades'

// ---- IndexedDB (file handles can only be persisted here) ----
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('trading-journal', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv').objectStore('kv').get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    tx.objectStore('kv').put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const getSavedHandle = () => idbGet('excel-handle')
export const saveHandle = (handle) => idbSet('excel-handle', handle)
export const clearHandle = () => idbSet('excel-handle', null)

export async function queryPermission(handle) {
  return handle.queryPermission({ mode: 'readwrite' })
}

export async function requestPermission(handle) {
  return handle.requestPermission({ mode: 'readwrite' })
}

// ---- xlsx <-> trades ----
function tradesToSheet(XLSX, trades) {
  const rows = [...trades]
    .sort((a, b) => a.ts - b.ts)
    .map((t) => ({
      Date: new Date(t.ts).toLocaleDateString('en-IN'),
      Time: new Date(t.ts).toLocaleTimeString('en-IN'),
      Symbol: t.symbol,
      Side: t.side,
      Asset: t.asset || 'OTHER',
      Size: t.size,
      Multiplier: t.multiplier ?? 1,
      Currency: t.currency ?? 'USD',
      Entry: t.entry,
      Exit: t.exit,
      PnL: Number(pnl(t).toFixed(2)),
      Emotion: t.emotion || 'neutral',
      Notes: t.notes || '',
      Id: t.id,
      Timestamp: new Date(t.ts).toISOString(),
    }))
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Date', 'Time', 'Symbol', 'Side', 'Asset', 'Size', 'Multiplier', 'Currency', 'Entry', 'Exit', 'PnL', 'Emotion', 'Notes', 'Id', 'Timestamp'],
  })
  ws['!cols'] = [
    { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
    { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 13 },
    { wch: 50 }, { wch: 15 }, { wch: 22 },
  ]
  return ws
}

// Never trust file contents blindly — coerce, clamp and cap every field
// so a hand-edited or corrupted workbook can't break the app.
const MAX_ROWS = 20000
const MAX_NOTES = 4000
const clampNum = (v, lo, hi) => Math.min(Math.max(Number(v) || 0, lo), hi)

function rowsToTrades(rows) {
  return rows
    .slice(0, MAX_ROWS)
    .filter((r) => r && r.Symbol)
    .map((r, i) => {
      const ts = r.Timestamp ? new Date(r.Timestamp).getTime() : NaN
      return {
        id: String(r.Id || 't-xlsx-' + i + '-' + Date.now()).slice(0, 64),
        symbol: String(r.Symbol).slice(0, 20),
        side: r.Side === 'SHORT' ? 'SHORT' : 'LONG',
        asset: String(r.Asset || 'OTHER').slice(0, 20),
        size: clampNum(r.Size, 0.0001, 1e9) || 1,
        multiplier: clampNum(r.Multiplier, 0.0001, 1e9) || 1,
        currency: r.Currency === 'INR' ? 'INR' : 'USD',
        entry: clampNum(r.Entry, 0, 1e12),
        exit: clampNum(r.Exit, 0, 1e12),
        emotion: r.Emotion ? String(r.Emotion).slice(0, 20) : undefined,
        notes: r.Notes ? String(r.Notes).slice(0, MAX_NOTES) : '',
        ts: Number.isFinite(ts) ? ts : Date.now(),
      }
    })
}

export async function readTradesFromFile(handle) {
  const file = await handle.getFile()
  if (file.size === 0) return null
  const XLSX = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[SHEET] ?? wb.Sheets[wb.SheetNames[0]]
  if (!ws) return null
  const rows = XLSX.utils.sheet_to_json(ws)
  return rowsToTrades(rows)
}

export async function writeTradesToFile(handle, trades) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, tradesToSheet(XLSX, trades), SHEET)
  const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

export async function pickNewFile() {
  return window.showSaveFilePicker({
    suggestedName: 'trading-journal.xlsx',
    types: [
      {
        description: 'Excel workbook',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      },
    ],
  })
}

export async function pickExistingFile() {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'Excel workbook',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      },
    ],
  })
  return handle
}
