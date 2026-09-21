export default function CapsuleCard({ capsule, onEdit, onDelete }) {
  return (
    <article className="capsule-card">
      <div className="capsule-card-header">
        <div>
          <h3>{capsule.prompt_title}</h3>
          <div className="capsule-meta">
            <span className="tag">{capsule.project_name}</span>
            {capsule.prompt_version && <span className="tag tag-muted">{capsule.prompt_version}</span>}
            {capsule.category && <span className="tag tag-muted">{capsule.category}</span>}
          </div>
        </div>
        <div className="capsule-card-actions">
          <button className="btn btn-sm" onClick={() => onEdit(capsule)}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(capsule)}>Delete</button>
        </div>
      </div>

      <p className="capsule-prompt"><strong>Prompt:</strong> {capsule.prompt_text}</p>
      {capsule.response_summary && (
        <p className="capsule-response"><strong>Response summary:</strong> {capsule.response_summary}</p>
      )}
      {capsule.notes && <p className="capsule-notes"><strong>Notes:</strong> {capsule.notes}</p>}

      <div className="capsule-footer">
        <span className={`pill ${capsule.usefulness === 'Excellent' || capsule.usefulness === 'Good' ? 'pill-good' : 'pill-warn'}`}>
          {capsule.usefulness || 'Unrated'}
        </span>
        <span className={`pill ${capsule.reviewed ? 'pill-good' : 'pill-muted'}`}>
          {capsule.reviewed ? 'Reviewed' : 'Not reviewed'}
        </span>
        <span className={`pill ${capsule.improved ? 'pill-good' : 'pill-muted'}`}>
          {capsule.improved ? 'Improved' : 'Not improved'}
        </span>
        {capsule.screenshot_url && (
          <a className="pill pill-link" href={capsule.screenshot_url} target="_blank" rel="noreferrer">
            Screenshot ↗
          </a>
        )}
        <span className="capsule-date">{new Date(capsule.created_at).toLocaleString()}</span>
      </div>
    </article>
  );
}
