import { useCallback, useEffect, useRef, useState } from 'react'
import { instrumentFor } from './instruments.js'
import { inferEmotion } from './emotions.js'
import {
  excelSupported,
  getSavedHandle,
  saveHandle,
  clearHandle,
  queryPermission,
  requestPermission,
  readTradesFromFile,
  writeTradesToFile,
  pickNewFile,
  pickExistingFile,
} from './excelStore.js'

const STORAGE_KEY = 'trading-journal.trades'

// Older saves lack currency/multiplier (pre-instrument era) or emotion
// (pre-psychology era) — fill both in without touching user-set values.
function migrate(trades) {
  const upgraded = trades.map((t) => {
    if (t.currency && t.multiplier != null) return t
    const inst = instrumentFor(t.symbol)
    return { multiplier: inst.multiplier, currency: inst.currency, asset: t.asset ?? inst.asset, ...t }
  })
  const sorted = [...upgraded].sort((a, b) => a.ts - b.ts)
  const done = []
  const emotionOf = new Map()
  for (const t of sorted) {
    emotionOf.set(t.id, t.emotion ?? inferEmotion(t, done))
    done.push(t)
  }
  return upgraded.map((t) =>
    t.emotion ? t : { ...t, emotion: emotionOf.get(t.id), emotionAuto: true }
  )
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch (e) {
    console.error('Could not load trades', e)
  }
  return []
}

function persist(trades) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  } catch (e) {
    console.error('Could not save trades', e)
  }
}

export function useTrades() {
  const [trades, setTrades] = useState(load)
  // excel: { supported, status: 'none' | 'connected' | 'needs-permission' | 'error', fileName, error }
  const [excel, setExcel] = useState({ supported: excelSupported, status: 'none', fileName: null, error: null })
  const handleRef = useRef(null)
  const writeTimer = useRef(null)
  const skipNextWrite = useRef(true) // don't write back what we just loaded

  useEffect(() => persist(trades), [trades])

  // Reconnect a previously chosen Excel file on startup
  useEffect(() => {
    if (!excelSupported) return
    let cancelled = false
    ;(async () => {
      try {
        const handle = await getSavedHandle()
        if (!handle || cancelled) return
        handleRef.current = handle
        const perm = await queryPermission(handle)
        if (perm === 'granted') {
          const fileTrades = await readTradesFromFile(handle)
          if (cancelled) return
          if (fileTrades && fileTrades.length) {
            skipNextWrite.current = true
            setTrades(migrate(fileTrades))
          }
          setExcel({ supported: true, status: 'connected', fileName: handle.name, error: null })
        } else {
          setExcel({ supported: true, status: 'needs-permission', fileName: handle.name, error: null })
        }
      } catch (e) {
        console.error('Excel reconnect failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Debounced write-through to the Excel file on every change
  useEffect(() => {
    if (excel.status !== 'connected' || !handleRef.current) return
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => {
      writeTradesToFile(handleRef.current, trades).catch((e) => {
        console.error('Excel write failed', e)
        setExcel((s) => ({ ...s, status: 'error', error: 'Could not write to the Excel file.' }))
      })
    }, 400)
    return () => clearTimeout(writeTimer.current)
  }, [trades, excel.status])

  const connectNewFile = useCallback(async () => {
    try {
      const handle = await pickNewFile()
      await writeTradesToFile(handle, trades)
      await saveHandle(handle)
      handleRef.current = handle
      skipNextWrite.current = true
      setExcel({ supported: true, status: 'connected', fileName: handle.name, error: null })
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e)
    }
  }, [trades])

  const connectExistingFile = useCallback(async () => {
    try {
      const handle = await pickExistingFile()
      if ((await requestPermission(handle)) !== 'granted') return
      const fileTrades = await readTradesFromFile(handle)
      await saveHandle(handle)
      handleRef.current = handle
      if (fileTrades && fileTrades.length) {
        skipNextWrite.current = true
        setTrades(migrate(fileTrades))
      } else {
        await writeTradesToFile(handle, trades)
      }
      setExcel({ supported: true, status: 'connected', fileName: handle.name, error: null })
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e)
    }
  }, [trades])

  const grantExcelAccess = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    try {
      if ((await requestPermission(handle)) !== 'granted') return
      const fileTrades = await readTradesFromFile(handle)
      if (fileTrades && fileTrades.length) {
        skipNextWrite.current = true
        setTrades(migrate(fileTrades))
      }
      setExcel({ supported: true, status: 'connected', fileName: handle.name, error: null })
    } catch (e) {
      console.error(e)
      setExcel((s) => ({ ...s, status: 'error', error: 'Could not read the Excel file.' }))
    }
  }, [])

  const disconnectExcel = useCallback(async () => {
    await clearHandle()
    handleRef.current = null
    setExcel({ supported: excelSupported, status: 'none', fileName: null, error: null })
  }, [])

  const syncNow = useCallback(async () => {
    if (!handleRef.current) return
    await writeTradesToFile(handleRef.current, trades)
  }, [trades])

  const addTrade = useCallback((trade) => {
    setTrades((prev) => [...prev, { ...trade, id: 't' + Date.now(), ts: trade.ts ?? Date.now() }])
  }, [])

  // Batch insert (statement imports). A single setTrades call with indexed
  // ids — looping addTrade would mint duplicate 't' + Date.now() ids.
  // migrate() runs on the merged list so imported trades get their emotion
  // auto-inferred immediately instead of waiting for the next app load.
  const addManyTrades = useCallback((newTrades) => {
    setTrades((prev) =>
      migrate([
        ...prev,
        ...newTrades.map((t, i) => ({ ...t, id: 't' + (Date.now() + i), ts: t.ts ?? Date.now() })),
      ])
    )
  }, [])

  const updateTrade = useCallback((id, patch) => {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTrade = useCallback((id) => {
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTrades([])
  }, [])

  return {
    trades, addTrade, addManyTrades, updateTrade, deleteTrade, resetAll,
    excel: { ...excel, connectNewFile, connectExistingFile, grantExcelAccess, disconnectExcel, syncNow },
  }
}
