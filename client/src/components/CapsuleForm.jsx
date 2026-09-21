import { useState } from 'react';

const CATEGORY_OPTIONS = ['Coding', 'Writing', 'Research', 'Debugging', 'Study', 'Other'];
const USEFULNESS_OPTIONS = ['Excellent', 'Good', 'Needs Improvement', 'Not Useful'];

const emptyForm = {
  project_name: '',
  prompt_title: '',
  prompt_version: 'v1',
  prompt_text: '',
  response_summary: '',
  category: 'Coding',
  usefulness: 'Good',
  reviewed: false,
  improved: false,
  screenshot_url: '',
  notes: '',
};

export default function CapsuleForm({ initialValue, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...(initialValue || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.project_name.trim() || !form.prompt_title.trim() || !form.prompt_text.trim()) {
      setError('Project name, prompt title and prompt text are required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="capsule-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <label>
          Project name *
          <input
            value={form.project_name}
            onChange={(e) => update('project_name', e.target.value)}
            placeholder="SmartFarm Irrigation"
            required
          />
        </label>

        <label>
          Prompt title *
          <input
            value={form.prompt_title}
            onChange={(e) => update('prompt_title', e.target.value)}
            placeholder="Debug cloud deployment"
            required
          />
        </label>

        <label>
          Version
          <input
            value={form.prompt_version || ''}
            onChange={(e) => update('prompt_version', e.target.value)}
            placeholder="v1"
          />
        </label>

        <label>
          Category
          <select value={form.category || ''} onChange={(e) => update('category', e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label>
          Usefulness
          <select value={form.usefulness || ''} onChange={(e) => update('usefulness', e.target.value)}>
            {USEFULNESS_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>

        <label>
          Screenshot evidence (URL)
          <input
            value={form.screenshot_url || ''}
            onChange={(e) => update('screenshot_url', e.target.value)}
            placeholder="https://…"
          />
        </label>
      </div>

      <label>
        Prompt text *
        <textarea
          rows={3}
          value={form.prompt_text}
          onChange={(e) => update('prompt_text', e.target.value)}
          placeholder="Why does my Node server fail on deploy?"
          required
        />
      </label>

      <label>
        Response summary
        <textarea
          rows={2}
          value={form.response_summary || ''}
          onChange={(e) => update('response_summary', e.target.value)}
          placeholder="Check the start command and PORT binding."
        />
      </label>

      <label>
        Notes
        <textarea
          rows={2}
          value={form.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Tested and worked."
        />
      </label>

      <div className="form-checkboxes">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={!!form.reviewed}
            onChange={(e) => update('reviewed', e.target.checked)}
          />
          Reviewed
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={!!form.improved}
            onChange={(e) => update('improved', e.target.checked)}
          />
          Improved
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
