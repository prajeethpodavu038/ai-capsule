import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import CapsuleForm from '../components/CapsuleForm.jsx';
import CapsuleCard from '../components/CapsuleCard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingCapsule, setEditingCapsule] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meData, capsuleData] = await Promise.all([api.me(), api.listCapsules()]);
      setMe(meData);
      setCapsules(capsuleData);
    } catch (err) {
      // Defense in depth: the server already gates the /dashboard PAGE, but
      // if the cookie expired while this tab was open, the API calls will
      // 401 and we bounce back to the landing page.
      if (err.status === 401) {
        navigate('/?login_required=1');
      } else {
        setError(err.message || 'Failed to load your capsules.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(form) {
    const created = await api.createCapsule(form);
    setCapsules((prev) => [created, ...prev]);
    setShowCreate(false);
  }

  async function handleUpdate(form) {
    const updated = await api.updateCapsule(editingCapsule.id, form);
    setCapsules((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditingCapsule(null);
  }

  async function handleDelete(capsule) {
    if (!confirm(`Delete "${capsule.prompt_title}"? This can't be undone.`)) return;
    await api.deleteCapsule(capsule.id);
    setCapsules((prev) => prev.filter((c) => c.id !== capsule.id));
  }

  return (
    <div className="page dashboard">
      <header className="dashboard-header">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <span className="brand-name">Capsule</span>
        </div>

        {me && (
          <div className="user-chip">
            {me.avatarUrl && <img src={me.avatarUrl} alt="" className="avatar" />}
            <span>{me.username}</span>
            <a className="btn btn-sm btn-ghost" href="/logout">Sign out</a>
          </div>
        )}
      </header>

      <div className="dashboard-toolbar">
        <h1>Your prompt capsules</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Close' : '+ New capsule'}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showCreate && (
        <div className="panel">
          <h2>New capsule</h2>
          <CapsuleForm submitLabel="Create capsule" onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {editingCapsule && (
        <div className="panel">
          <h2>Edit capsule</h2>
          <CapsuleForm
            initialValue={editingCapsule}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditingCapsule(null)}
          />
        </div>
      )}

      {loading ? (
        <p className="muted">Loading your capsules…</p>
      ) : capsules.length === 0 ? (
        <div className="empty-state">
          <p>No capsules yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="capsule-list">
          {capsules.map((c) => (
            <CapsuleCard key={c.id} capsule={c} onEdit={setEditingCapsule} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
