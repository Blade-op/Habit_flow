import { memo } from 'react';

// Returns YYYY-MM-DD in the user's LOCAL timezone (no UTC-shift)
function localDateStr(date) {

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Visual config for each status
const STATUS_CONFIG = {
  completed: {
    icon: '✓',
    label: 'Completed',
    className: 'checked',
    nextLabel: 'Mark as Skipped',
  },
  skipped: {
    icon: '⏭',
    label: 'Skipped',
    className: 'skipped',
    nextLabel: 'Mark as Missed',
  },
  missed: {
    icon: '',
    label: 'Missed',
    className: '',
    nextLabel: 'Mark as Completed',
  },
};

function HabitRow({ habit, weekDates, getStatus, onToggle, onEdit, onDelete }) {
  // Today's local date string for future-date blocking
  const todayStr = localDateStr(new Date());

  const isScheduled = (date) => {
    const dayOfWeek = date.getDay();
    if (habit.frequency === 'daily') return true;
    return habit.days && habit.days.includes(dayOfWeek);
  };

  return (
    <div className="habit-row">
      {/* Habit name */}
      <div className="habit-row-name">
        <div className="habit-color-dot" style={{ background: habit.color || '#a78bfa' }} />
        <div>
          <div className="habit-title-text">{habit.title}</div>
          {habit.target && <div className="habit-subtitle">🎯 {habit.target}</div>}
        </div>
      </div>

      {/* Day checkboxes */}
      {weekDates.map((date) => {
        const dateStr = localDateStr(date);
        const scheduled = isScheduled(date);
        const status = scheduled ? (getStatus ? getStatus(habit._id, dateStr) : 'missed') : null;
        const isFuture = dateStr > todayStr;
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.missed;

        return (
          <div className="habit-cell" key={dateStr}>
            {scheduled ? (
              isFuture ? (
                // Future scheduled day — show a greyed-out, non-interactive box
                <div
                  className="habit-checkbox not-scheduled"
                  title="Can't mark future dates"
                  style={{ opacity: 0.35, cursor: 'not-allowed' }}
                />
              ) : (
                <button
                  className={`habit-checkbox${config.className ? ' ' + config.className : ''}`}
                  style={
                    status === 'completed'
                      ? { background: habit.color || '#a78bfa', boxShadow: `0 2px 8px ${habit.color || '#a78bfa'}50` }
                      : status === 'skipped'
                      ? { background: 'var(--amber)', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }
                      : {}
                  }
                  onClick={() => onToggle(habit._id, dateStr)}
                  aria-label={`${config.nextLabel} — ${habit.title} on ${dateStr}`}
                  id={`cb-${habit._id}-${dateStr}`}
                  title={`${config.label} — click to cycle status`}
                >
                  <span style={{ color: status === 'missed' ? 'transparent' : 'white', fontSize: status === 'skipped' ? '0.7rem' : '0.85rem' }}>
                    {config.icon}
                  </span>
                </button>
              )
            ) : (
              <div className="habit-checkbox not-scheduled" title="Not scheduled" />
            )}
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="habit-row-actions">
        <button className="action-btn" onClick={() => onEdit(habit)} aria-label={`Edit ${habit.title}`} title="Edit">
          ✏️
        </button>
        <button className="action-btn delete" onClick={() => onDelete(habit._id)} aria-label={`Delete ${habit.title}`} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  );
}

// Memoize — only re-renders when its own props change, not when sibling habits update
export default memo(HabitRow);
