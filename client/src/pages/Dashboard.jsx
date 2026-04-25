import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import { useTracking } from '../hooks/useTracking';
import CheckboxGrid from '../components/CheckboxGrid';
import HabitModal from '../components/HabitModal';
import ProgressRing from '../components/ProgressRing';

// Returns YYYY-MM-DD in the user's LOCAL timezone (no UTC-shift)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek + offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: localDateStr(start),
    endDate: localDateStr(end),
  };
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [toast, setToast] = useState(null);

  const { habits, loading, addHabit, editHabit, removeHabit } = useHabits();
  const { startDate, endDate } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const { records, getStatus, isCompleted, isDaySkipped, toggle, skipDay } = useTracking(startDate, endDate);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Today's stats — exclude skipped from totals
  const todayStr = localDateStr(new Date());
  const todayDow = new Date().getDay();
  const todayHabits = habits.filter(
    (h) => h.frequency === 'daily' || (h.days && h.days.includes(todayDow))
  );

  const todayCompleted = todayHabits.filter((h) => getStatus(h._id, todayStr) === 'completed').length;
  const todaySkipped   = todayHabits.filter((h) => getStatus(h._id, todayStr) === 'skipped').length;
  const todayActive    = todayHabits.length - todaySkipped; // exclude skipped from denominator
  const todayPct       = todayActive > 0 ? Math.round((todayCompleted / todayActive) * 100) : 0;

  // Weekly stats — count only completed (not skipped)
  const weekCompleted = records.filter((r) => (r.effectiveStatus || r.status) === 'completed').length;

  // Streak — skipped days are transparent (don't break streak)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = localDateStr(d);
      const dow = d.getDay();
      const scheduled = habits.filter((h) => h.frequency === 'daily' || (h.days && h.days.includes(dow)));
      if (scheduled.length === 0) { streak++; continue; }

      const statuses = scheduled.map((h) => getStatus(h._id, ds));
      const allSkippedOrDone = statuses.every((s) => s === 'completed' || s === 'skipped');
      const anyCompleted = statuses.some((s) => s === 'completed');
      const allSkipped = statuses.every((s) => s === 'skipped');

      if (allSkipped) {
        // Day fully skipped — transparent, continue streak
        continue;
      } else if (allSkippedOrDone && anyCompleted) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [habits, records, getStatus]);

  const handleSave = async (formData) => {
    if (editingHabit) {
      await editHabit(editingHabit._id, formData);
      showToast('Habit updated!');
    } else {
      await addHabit(formData);
      showToast('Habit created! 🎉');
    }
    setEditingHabit(null);
  };

  const handleEdit = useCallback((habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Delete this habit?')) {
      await removeHabit(id);
      showToast('Habit deleted.', 'error');
    }
  }, [removeHabit]);

  const openAddModal = useCallback(() => {
    setEditingHabit(null);
    setModalOpen(true);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Dashboard 🏠</h1>
          <p>{formatDate(new Date())}</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} id="open-add-habit-btn">
          ✨ New Habit
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        {/* Progress Ring */}
        <div className="stat-card purple stat-card-progress" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <div className="progress-ring-stat" style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <ProgressRing percent={todayPct} size={80} stroke={7} color="#7c3aed" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Today's Progress</div>
            <div className="stat-value">
              {todayCompleted}
              <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{todayActive}</span>
            </div>
            {todaySkipped > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--amber)', marginTop: 2 }}>
                ⏭ {todaySkipped} skipped today
              </div>
            )}
          </div>
        </div>

        <div className="stat-card pink">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-label">Day Streak</div>
        </div>

        <div className="stat-card teal">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{weekCompleted}</div>
          <div className="stat-label">This Week</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon">🌱</div>
          <div className="stat-value">{habits.length}</div>
          <div className="stat-label">Total Habits</div>
        </div>
      </div>

      {/* Habit Grid */}
      {loading ? (
        <div className="spinner-wrapper"><div className="spinner" /></div>
      ) : (
        <CheckboxGrid
          habits={habits}
          getStatus={getStatus}
          isCompleted={isCompleted}
          onToggle={toggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          onSkipDay={skipDay}
          isDaySkipped={isDaySkipped}
        />
      )}

      {/* Quick links */}
      {habits.length === 0 && !loading && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="empty-state-icon">🌟</div>
          <h3>Ready to build great habits?</h3>
          <p>Start by adding your first habit!</p>
          <button className="btn btn-primary" onClick={openAddModal}>✨ Add Your First Habit</button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <HabitModal
          habit={editingHabit}
          onClose={() => { setModalOpen(false); setEditingHabit(null); }}
          onSave={handleSave}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '🗑️'} {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
