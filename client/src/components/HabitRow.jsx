// Returns YYYY-MM-DD in the user's LOCAL timezone (no UTC-shift)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HabitRow({ habit, weekDates, isCompleted, onToggle, onEdit, onDelete }) {
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
        const completed = scheduled && isCompleted(habit._id, dateStr);
        // Block interaction for any date strictly after today
        const isFuture = dateStr > todayStr;

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
                  className={`habit-checkbox${completed ? ' checked' : ''}`}
                  style={completed ? { background: habit.color || '#a78bfa', boxShadow: `0 2px 8px ${habit.color || '#a78bfa'}50` } : {}}
                  onClick={() => onToggle(habit._id, dateStr)}
                  aria-label={`${completed ? 'Unmark' : 'Mark'} ${habit.title} on ${dateStr}`}
                  id={`cb-${habit._id}-${dateStr}`}
                  title={dateStr}
                >
                  {completed && '✓'}
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
