import Icon from './Icon.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'journal', label: 'Journal', icon: 'timeline' },
  { id: 'psychology', label: 'Psychology', icon: 'psychology' },
  { id: 'profile', label: 'Profile', icon: 'person' },
]

export default function BottomNav({ view, onNavigate }) {
  const activeTab = view === 'new-entry' ? 'journal' : view
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => onNavigate(tab.id)}
          >
            <Icon name={tab.icon} size={24} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
