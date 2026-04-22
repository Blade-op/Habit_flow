import HabitRow from './HabitRow';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Returns YYYY-MM-DD in the user's LOCAL timezone (no UTC-shift)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + weekOffset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function getDailyProgress(habits, weekDates, isCompleted) {
  return weekDates.map((date) => {
    const dateStr = localDateStr(date);
    const dayOfWeek = date.getDay();
    let scheduled = 0, completed = 0;
    habits.forEach((habit) => {
      const isScheduled = habit.frequency === 'daily' || (habit.days && habit.days.includes(dayOfWeek));
      if (isScheduled) {
        scheduled++;
        if (isCompleted(habit._id, dateStr)) completed++;
      }
    });
    return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
  });
}

export default function CheckboxGrid({
  habits,
  isCompleted,
  onToggle,
  onEdit,
  onDelete,
  weekOffset,
  onWeekChange,
}) {
  const weekDates = getWeekDates(weekOffset);
  const todayStr = localDateStr(new Date());
  const dailyProgress = getDailyProgress(habits, weekDates, isCompleted);

  const weekLabel = `${MONTH_SHORT[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTH_SHORT[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${weekDates[0].getFullYear()}`;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-16">
        <div className="week-nav">
          <button className="week-nav-btn" onClick={() => onWeekChange(weekOffset - 1)} id="prev-week-btn" aria-label="Previous week">◀</button>
          <span className="week-nav-label">📅 {weekLabel}</span>
          <button className="week-nav-btn" onClick={() => onWeekChange(weekOffset + 1)} id="next-week-btn" aria-label="Next week">▶</button>
          {weekOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onWeekChange(0)} id="today-btn">Today</button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="habit-grid-wrapper">
        <div className="habit-grid">
          {/* Header row */}
          <div className="habit-grid-header">
            <div className="grid-header-cell habit-name-col">HABIT</div>
            {weekDates.map((date) => {
              const dateStr = localDateStr(date);
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={`grid-header-cell${isToday ? ' today' : ''}`}>
                  <div>{DAY_LABELS[date.getDay()]}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>{date.getDate()}</div>
                </div>
              );
            })}
            <div className="grid-header-cell">ACTION</div>
          </div>

          {/* Habit rows */}
          {habits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌱</div>
              <h3>No habits yet</h3>
              <p>Create your first habit to start tracking!</p>
            </div>
          ) : (
            habits.map((habit) => (
              <HabitRow
                key={habit._id}
                habit={habit}
                weekDates={weekDates}
                isCompleted={isCompleted}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}

          {/* Progress footer */}
          {habits.length > 0 && (
            <div className="grid-progress-row">
              <div className="grid-progress-cell" style={{ paddingLeft: '20px', justifyContent: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>DAILY %</span>
              </div>
              {dailyProgress.map((pct, i) => (
                <div className="grid-progress-cell" key={i}>
                  <span className={`progress-pill${pct === 100 ? ' full' : pct === 0 ? ' zero' : ''}`}>
                    {pct}%
                  </span>
                </div>
              ))}
              <div className="grid-progress-cell" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
