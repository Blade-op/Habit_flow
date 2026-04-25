import { memo } from 'react';
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

/**
 * Get scheduled habits for a specific date.
 */
function getScheduledHabits(habits, date) {
  const dayOfWeek = date.getDay();
  return habits.filter(
    (habit) => habit.frequency === 'daily' || (habit.days && habit.days.includes(dayOfWeek))
  );
}

/**
 * Calculate daily progress percentage, excluding skipped from the denominator.
 * Returns null when all habits are skipped (no active tracking).
 */
function getDailyProgress(habits, weekDates, getStatus) {
  return weekDates.map((date) => {
    const dateStr = localDateStr(date);
    const scheduled = getScheduledHabits(habits, date);
    if (scheduled.length === 0) return { pct: 0, allSkipped: false };

    let completed = 0;
    let skipped = 0;
    scheduled.forEach((habit) => {
      const status = getStatus(habit._id, dateStr);
      if (status === 'completed') completed++;
      else if (status === 'skipped') skipped++;
    });

    const active = scheduled.length - skipped;
    const allSkipped = skipped === scheduled.length;
    const pct = active > 0 ? Math.round((completed / active) * 100) : null;

    return { pct, allSkipped };
  });
}

function CheckboxGrid({
  habits,
  getStatus,
  isCompleted, // legacy — ignored if getStatus is present
  onToggle,
  onEdit,
  onDelete,
  weekOffset,
  onWeekChange,
  onSkipDay,
  isDaySkipped,
}) {
  const weekDates = getWeekDates(weekOffset);
  const todayStr = localDateStr(new Date());

  // Resolve which status getter to use (supports legacy isCompleted prop)
  const resolvedGetStatus = getStatus || ((habitId, dateStr) =>
    isCompleted && isCompleted(habitId, dateStr) ? 'completed' : 'missed'
  );

  const dailyProgress = getDailyProgress(habits, weekDates, resolvedGetStatus);

  const weekLabel = `${MONTH_SHORT[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTH_SHORT[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${weekDates[0].getFullYear()}`;

  const handleSkipDay = (dateStr, date) => {
    if (!onSkipDay) return;
    const scheduledHabits = getScheduledHabits(habits, date);
    onSkipDay(dateStr, scheduledHabits);
  };

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
              const isFuture = dateStr > todayStr;
              const scheduledHabits = getScheduledHabits(habits, date);
              const daySkipped = isDaySkipped ? isDaySkipped(dateStr, scheduledHabits) : false;

              return (
                <div
                  key={dateStr}
                  className={`grid-header-cell${isToday ? ' today' : ''}${daySkipped ? ' day-skipped' : ''}`}
                >
                  <div>{DAY_LABELS[date.getDay()]}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>{date.getDate()}</div>

                  {/* Skip Day button — only shown for past/present dates with scheduled habits */}
                  {!isFuture && habits.length > 0 && scheduledHabits.length > 0 && onSkipDay && (
                    <button
                      className={`day-skip-btn${daySkipped ? ' active' : ''}`}
                      onClick={() => handleSkipDay(dateStr, date)}
                      id={`skip-day-${dateStr}`}
                      aria-label={daySkipped ? `Day ${dateStr} already skipped` : `Skip all habits on ${dateStr}`}
                      title={daySkipped ? 'Day skipped — click to manage' : 'Skip all habits today'}
                    >
                      {daySkipped ? '⏭ Skipped' : 'Skip Day'}
                    </button>
                  )}
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
                getStatus={resolvedGetStatus}
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
              {dailyProgress.map(({ pct, allSkipped }, i) => (
                <div className="grid-progress-cell" key={i}>
                  {allSkipped ? (
                    <span className="progress-pill skipped-pill" title="All habits skipped">⏭</span>
                  ) : (
                    <span className={`progress-pill${pct === 100 ? ' full' : pct === 0 ? ' zero' : ''}`}>
                      {pct ?? 0}%
                    </span>
                  )}
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

// Memoize — avoids re-rendering on parent state changes unrelated to habits/tracking
export default memo(CheckboxGrid);
