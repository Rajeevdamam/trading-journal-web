import { useCallback, useState } from 'react'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import Dashboard from './views/Dashboard.jsx'
import Journal from './views/Journal.jsx'
import NewEntry from './views/NewEntry.jsx'
import Psychology from './views/Psychology.jsx'
import Profile from './views/Profile.jsx'
import LockGate from './components/LockGate.jsx'
import { useTrades } from './lib/store.js'

export default function App() {
  return (
    <LockGate>
      <JournalApp />
    </LockGate>
  )
}

function JournalApp() {
  const { trades, addTrade, addManyTrades, updateTrade, deleteTrade, resetAll, excel } = useTrades()
  const [view, setView] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [editingTrade, setEditingTrade] = useState(null)

  const navigate = useCallback((next) => {
    setView(next)
    if (next !== 'new-entry') setEditingTrade(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const openNewEntry = useCallback(() => {
    setEditingTrade(null)
    navigate('new-entry')
  }, [navigate])

  const openEdit = useCallback(
    (trade) => {
      setEditingTrade(trade)
      navigate('new-entry')
    },
    [navigate]
  )

  const handleSave = useCallback(
    (data) => {
      if (editingTrade) updateTrade(editingTrade.id, data)
      else addTrade(data)
      setTimeout(() => navigate('journal'), 450)
    },
    [editingTrade, addTrade, updateTrade, navigate]
  )

  return (
    <div className="app-shell">
      <Header
        search={search}
        onSearch={(value) => {
          setSearch(value)
          if (value && view !== 'journal' && view !== 'new-entry') navigate('journal')
        }}
        onSearchFocusJournal={() => view !== 'journal' && view !== 'new-entry' && navigate('journal')}
      />

      {view === 'dashboard' && (
        <Dashboard trades={trades} onViewAll={() => navigate('journal')} onNewEntry={openNewEntry} />
      )}
      {view === 'journal' && (
        <Journal
          trades={trades}
          search={search}
          onNewEntry={openNewEntry}
          onEdit={openEdit}
          onDelete={deleteTrade}
          onEmotionChange={(id, emotion) => updateTrade(id, { emotion, emotionAuto: false })}
        />
      )}
      {view === 'new-entry' && (
        <NewEntry
          key={editingTrade?.id ?? 'new'}
          trades={trades}
          editingTrade={editingTrade}
          onSave={handleSave}
          onBack={() => navigate('journal')}
        />
      )}
      {view === 'psychology' && <Psychology trades={trades} onReview={() => navigate('journal')} />}
      {view === 'profile' && (
        <Profile trades={trades} addManyTrades={addManyTrades} onReset={resetAll} excel={excel} />
      )}

      <BottomNav view={view} onNavigate={navigate} />
    </div>
  )
}
