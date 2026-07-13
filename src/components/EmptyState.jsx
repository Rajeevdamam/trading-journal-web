import Icon from './Icon.jsx'

export default function EmptyState({ illustration, title, text, actionLabel, onAction }) {
  return (
    <div className="card empty-card">
      <div className="empty-illustration" aria-hidden="true">
        <img src={illustration} alt="" className="empty-illustration-img" />
      </div>
      <p className="section-title">{title}</p>
      <p className="muted" style={{ maxWidth: 320, fontSize: 14, lineHeight: '20px' }}>{text}</p>
      {actionLabel && (
        <button className="pill-btn primary" style={{ marginTop: 6 }} onClick={onAction}>
          <Icon name="add" size={16} /> {actionLabel}
        </button>
      )}
    </div>
  )
}
