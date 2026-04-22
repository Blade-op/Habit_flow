const express = require('express');
const Tracking = require('../models/Tracking');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

// Returns YYYY-MM-DD in the SERVER'S local timezone (avoids UTC-shift)
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: returns true if a habit is scheduled on a given JS Date
function isHabitScheduledOn(habit, date) {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'custom') return habit.days.includes(date.getDay());
  return false;
}

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    // Step 1 — fetch all habits for the logged-in user
    const habits = await Habit.find({ userId: req.userId });

    // Edge case: no habits at all
    if (habits.length === 0) {
      return res.json({
        overallRate: 0,
        totalCompleted: 0,
        totalScheduled: 0,
        mostConsistent: null,
        leastFollowed: null,
        habitStats: [],
        dailyData: [],
      });
    }

    const todayStr = toDateStr(new Date());

    // Determine the earliest habit creation date as the analysis start date
    const earliestCreated = habits.reduce((min, h) => {
      const d = new Date(h.createdAt);
      return d < min ? d : min;
    }, new Date(habits[0].createdAt));

    // Clamp to at most 30 days ago so the charts stay manageable
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const analysisStart = earliestCreated < thirtyDaysAgo ? thirtyDaysAgo : earliestCreated;
    const analysisStartStr = toDateStr(analysisStart);

    // Fetch tracking only within the analysis window
    const userHabitIds = habits.map((h) => h._id);
    const allTracking = await Tracking.find({
      habitId: { $in: userHabitIds },
      date: { $gte: analysisStartStr, $lte: todayStr },
    });

    // Map: habitId (string) → tracking records[]
    const trackingByHabit = {};
    allTracking.forEach((t) => {
      const id = t.habitId.toString();
      if (!trackingByHabit[id]) trackingByHabit[id] = [];
      trackingByHabit[id].push(t);
    });

    // ── Per-habit stats ───────────────────────────────────────────────────────
    const habitStats = habits.map((habit) => {
      const habitCreated = new Date(habit.createdAt);
      habitCreated.setHours(0, 0, 0, 0);
      const habitStart = habitCreated > analysisStart ? habitCreated : analysisStart;

      const records = trackingByHabit[habit._id.toString()] || [];

      let scheduledDays = 0;
      let completedDays = 0;

      // Walk day-by-day from this habit's start up to and including today
      const cursor = new Date(habitStart);
      while (toDateStr(cursor) <= todayStr) {
        if (isHabitScheduledOn(habit, cursor)) {
          scheduledDays++;
          const ds = toDateStr(cursor);
          if (records.some((r) => r.date === ds && r.completed)) {
            completedDays++;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const completionRate =
        scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0;

      // Current streak (consecutive scheduled days completed, going back from today)
      let streak = 0;
      const checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);
      for (let safety = 0; safety < 366; safety++) {
        if (checkDate < habitCreated) break;
        if (!isHabitScheduledOn(habit, checkDate)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        const ds = toDateStr(checkDate);
        if (records.some((r) => r.date === ds && r.completed)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        habitId: habit._id,
        title: habit.title,
        color: habit.color,
        completedDays,
        scheduledDays,
        completionRate,
        streak,
      };
    });

    // ── Daily data (bar / line charts) ────────────────────────────────────────
    // Only include dates where at least one habit was scheduled
    const dailyData = [];
    const cursor = new Date(analysisStart);
    cursor.setHours(0, 0, 0, 0);

    while (toDateStr(cursor) <= todayStr) {
      const dateStr = toDateStr(cursor);

      // Step 2 — filter habits scheduled for this date AND created by this date
      const scheduledHabits = habits.filter((habit) => {
        const habitCreated = new Date(habit.createdAt);
        habitCreated.setHours(0, 0, 0, 0);
        return habitCreated <= cursor && isHabitScheduledOn(habit, cursor);
      });

      // Step 3 — skip dates with no scheduled habits
      if (scheduledHabits.length > 0) {
        // Step 4 & 5 — count completions only for scheduled habits on this date
        let completed = 0;
        scheduledHabits.forEach((habit) => {
          const records = trackingByHabit[habit._id.toString()] || [];
          if (records.some((r) => r.date === dateStr && r.completed)) {
            completed++;
          }
        });

        const scheduled = scheduledHabits.length;
        const completionRate = Math.round((completed / scheduled) * 100);

        dailyData.push({
          date: dateStr,
          label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          scheduled,
          completed,
          completionRate,
          // keep "rate" alias so existing chart dataKeys still work
          rate: completionRate,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Overall summary ───────────────────────────────────────────────────────
    const totalScheduled = habitStats.reduce((sum, h) => sum + h.scheduledDays, 0);
    const totalCompleted = habitStats.reduce((sum, h) => sum + h.completedDays, 0);
    const overallRate =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    const sorted = [...habitStats].sort((a, b) => b.completionRate - a.completionRate);
    const mostConsistent = sorted[0] || null;
    const leastFollowed = sorted[sorted.length - 1] || null;

    res.json({
      overallRate,
      totalCompleted,
      totalScheduled,
      mostConsistent,
      leastFollowed,
      habitStats,
      dailyData, // only dates where ≥1 habit was scheduled
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
