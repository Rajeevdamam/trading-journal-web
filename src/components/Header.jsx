import { useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function Header({ search, onSearch, onSearchFocusJournal }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileInputRef = useRef(null)

  const toggleMobile = () => {
    if (window.innerWidth >= 768) return
    setMobileOpen((open) => {
      const next = !open
      if (next) {
        onSearchFocusJournal()
        setTimeout(() => mobileInputRef.current?.focus(), 50)
      }
      return next
    })
  }

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <div className="brand">
          <img className="brand-logo" src="/pwa-192.png" alt="" aria-hidden="true" />
          <h1 className="brand-title">Trading Journal</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="search-box desktop">
            <Icon name="search" size={18} style={{ color: 'var(--tertiary)' }} />
            <input
              type="text"
              placeholder="Search symbol…"
              aria-label="Search trades by symbol"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={onSearchFocusJournal}
            />
          </div>
          <button className="icon-btn search-toggle" aria-label="Search trades" onClick={toggleMobile}>
            <Icon name="search" size={24} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="mobile-search">
          <div className="search-box">
            <Icon name="search" size={18} style={{ color: 'var(--tertiary)' }} />
            <input
              ref={mobileInputRef}
              type="text"
              placeholder="Search symbol…"
              aria-label="Search trades by symbol"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}
    </header>
  )
}
