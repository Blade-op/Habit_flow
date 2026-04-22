import { useState, useEffect } from 'react';

const COLORS = [
  '#a78bfa', '#f472b6', '#60a5fa', '#2dd4bf',
  '#fbbf24', '#f87171', '#4ade80', '#fb923c',
  '#818cf8', '#e879f9',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultForm = {
  title: '',
  description: '',
  frequency: 'daily',
  days: [0, 1, 2, 3, 4, 5, 6],
  color: '#a78bfa',
  target: '',
};

export default function HabitModal({ habit, onClose, onSave }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setForm({
        title: habit.title || '',
        description: habit.description || '',
        frequency: habit.frequency || 'daily',
        days: habit.days || [0, 1, 2, 3, 4, 5, 6],
        color: habit.color || '#a78bfa',
        target: habit.target || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [habit]);

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
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label="Habit form">
        <div className="modal-header">
          <h2>{habit ? '✏️ Edit Habit' : '✨ New Habit'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="habit-title">Habit Title *</label>
            <input
              id="habit-title"
              className="form-input"
              placeholder="e.g. Morning Run"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="habit-desc">Description</label>
            <textarea
              id="habit-desc"
              className="form-input"
              placeholder="Optional notes..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
            />
          </div>

          {/* Target */}
          <div className="form-group">
            <label className="form-label" htmlFor="habit-target">Target</label>
            <input
              id="habit-target"
              className="form-input"
              placeholder="e.g. 30 minutes, 1 hour"
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
                  id={`freq-${f}`}
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
                    id={`day-${d}`}
                  >
                    {d.slice(0, 2)}
                  </button>
                ))}
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
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" id="save-habit-btn" disabled={saving}>
              {saving ? 'Saving...' : habit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
