import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';

const COLORS = [
  '#a78bfa', '#f472b6', '#60a5fa', '#2dd4bf',
  '#fbbf24', '#f87171', '#4ade80', '#fb923c',
  '#818cf8', '#e879f9',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddHabit() {
  const navigate = useNavigate();
  const { addHabit } = useHabits();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    days: [0, 1, 2, 3, 4, 5, 6],
    color: '#a78bfa',
    target: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (day) => {
    set('days', form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addHabit(form);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      alert('Error creating habit: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-habit-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>New Habit ✨</h1>
          <p>Build a new routine starting today</p>
        </div>
      </div>

      {success ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h3 style={{ fontWeight: 700 }}>Habit Created!</h3>
          <p className="text-muted" style={{ marginTop: 6 }}>Redirecting to dashboard...</p>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="add-title">Habit Title *</label>
              <input
                id="add-title"
                className="form-input"
                placeholder="e.g. Morning Run, Read 30 Minutes"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="add-desc">Description</label>
              <textarea
                id="add-desc"
                className="form-input"
                placeholder="Why is this habit important to you?"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Target */}
            <div className="form-group">
              <label className="form-label" htmlFor="add-target">Target / Goal</label>
              <input
                id="add-target"
                className="form-input"
                placeholder="e.g. 30 minutes, 8 glasses, 5km"
                value={form.target}
                onChange={(e) => set('target', e.target.value)}
              />
            </div>

            {/* Frequency */}
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <div className="freq-selector">
                {['daily', 'custom'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`freq-option${form.frequency === f ? ' selected' : ''}`}
                    onClick={() => set('frequency', f)}
                    id={`add-freq-${f}`}
                  >
                    {f === 'daily' ? '📅 Every Day' : '🗓️ Custom Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Days */}
            {form.frequency === 'custom' && (
              <div className="form-group">
                <label className="form-label">Select Days</label>
                <div className="days-selector">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`day-pill${form.days.includes(i) ? ' selected' : ''}`}
                      onClick={() => toggleDay(i)}
                      id={`add-day-${d}`}
                    >
                      {d.slice(0, 2)}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Selected: {form.days.length === 0 ? 'None' : form.days.map((d) => DAYS[d]).join(', ')}
                </div>
              </div>
            )}

            {/* Color */}
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-picker-row">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${form.color === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => set('color', c)}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              {/* Preview */}
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: form.color + '22',
                  borderLeft: `4px solid ${form.color}`,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: form.color }} />
                {form.title || 'Your Habit'} Preview
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" id="add-habit-submit" disabled={saving}>
                {saving ? '⏳ Creating...' : '✨ Create Habit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
