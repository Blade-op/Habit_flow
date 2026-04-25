const express = require('express');
const Tracking = require('../models/Tracking');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// ── In-memory cache (per user, 60-second TTL) ─────────────────────────────────
// Avoids re-running the full aggregation on repeated page visits/refreshes.
const cache = new Map(); // key: userId, value: { data, expiresAt }
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(userId) {
  const entry = cache.get(userId);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  cache.delete(userId);
  return null;
}
function setCached(userId, data) {
  cache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
// Exported so track.js / other routes can bust the cache on writes
function bustCache(userId) {
  cache.delete(String(userId));
}


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

// Backward-compat: resolve the effective status of a tracking record.
function resolveStatus(record) {
  if (!record) return 'missed';
  if (record.status === 'completed' || record.status === 'skipped') return record.status;
  if (record.completed === true) return 'completed';
  return 'missed';
}

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = getCached(String(userId));
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Step 1 — fetch only required fields from habits
    const habits = await Habit.find({ userId })
      .select('_id title color frequency days createdAt')
      .lean(); // .lean() returns plain JS objects — ~30% faster than Mongoose docs

    if (habits.length === 0) {
      const empty = {
        overallRate: null,
        totalCompleted: 0,
        totalMissed: 0,
        totalSkipped: 0,
        totalScheduled: 0,
        mostConsistent: null,
        leastFollowed: null,
        habitStats: [],
        dailyData: [],
      };
      return res.json(empty);
    }

    const todayStr = toDateStr(new Date());

    // Determine the earliest habit creation date as the analysis start date
    const earliestCreated = habits.reduce((min, h) => {
      const d = new Date(h.createdAt);
      return d < min ? d : min;
    }, new Date(habits[0].createdAt));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const analysisStart = earliestCreated < thirtyDaysAgo ? thirtyDaysAgo : earliestCreated;
    const analysisStartStr = toDateStr(analysisStart);

    const userHabitIds = habits.map((h) => h._id);

    // ── Step 2: Single aggregation to count status per (habitId, date) ────────
    // Uses the covering index { habitId, date, status } — no doc fetch needed.
    const trackingAgg = await Tracking.aggregate([
      {
        $match: {
          habitId: { $in: userHabitIds },
          date: { $gte: analysisStartStr, $lte: todayStr },
        },
      },
      {
        // Resolve effective status in the pipeline using $switch
        $addFields: {
          effectiveStatus: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'completed'] }, then: 'completed' },
                { case: { $eq: ['$status', 'skipped'] },   then: 'skipped'   },
                { case: { $eq: ['$completed', true] },      then: 'completed' },
              ],
              default: 'missed',
            },
          },
        },
      },
      {
        // Project only what we need — smaller docs through the pipeline
        $project: {
          habitId: 1,
          date: 1,
          effectiveStatus: 1,
          isDaySkipped: 1,
          _id: 0,
        },
      },
    ]);

    // Build a fast lookup map: habitId_date → effectiveStatus
    const trackMap = new Map(); // key: `${habitId}|${date}` → effectiveStatus
    trackingAgg.forEach((t) => {
      trackMap.set(`${t.habitId}|${t.date}`, t.effectiveStatus);
    });

    // ── Per-habit stats (replaces nested loop with map iteration) ─────────────
    const habitStats = habits.map((habit) => {
      const habitCreated = new Date(habit.createdAt);
      habitCreated.setHours(0, 0, 0, 0);
      const habitStart = habitCreated > analysisStart ? habitCreated : analysisStart;

      let scheduledDays = 0, completedDays = 0, missedDays = 0, skippedDays = 0;

      const cursor = new Date(habitStart);
      while (toDateStr(cursor) <= todayStr) {
        if (isHabitScheduledOn(habit, cursor)) {
          scheduledDays++;
          const ds = toDateStr(cursor);
          const status = trackMap.get(`${habit._id}|${ds}`) || 'missed';
          if (status === 'completed')      completedDays++;
          else if (status === 'skipped')   skippedDays++;
          else                             missedDays++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const activeDays = completedDays + missedDays;
      const completionRate = activeDays > 0
        ? Math.round((completedDays / activeDays) * 100)
        : null;

      // Streak — skipped days are transparent
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
        const status = trackMap.get(`${habit._id}|${ds}`) || 'missed';
        if (status === 'completed') {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (status === 'skipped') {
          checkDate.setDate(checkDate.getDate() - 1); // transparent
        } else {
          break;
        }
      }

      return {
        habitId: habit._id,
        title: habit.title,
        color: habit.color,
        completedDays,
        missedDays,
        skippedDays,
        scheduledDays,
        activeDays,
        completionRate,
        streak,
      };
    });

    // ── Daily data ─────────────────────────────────────────────────────────────
    const dailyData = [];
    const dayCursor = new Date(analysisStart);
    dayCursor.setHours(0, 0, 0, 0);

    while (toDateStr(dayCursor) <= todayStr) {
      const dateStr = toDateStr(dayCursor);

      const scheduledHabits = habits.filter((habit) => {
        const habitCreated = new Date(habit.createdAt);
        habitCreated.setHours(0, 0, 0, 0);
        return habitCreated <= dayCursor && isHabitScheduledOn(habit, dayCursor);
      });

      if (scheduledHabits.length > 0) {
        let completed = 0, missed = 0, skipped = 0;

        scheduledHabits.forEach((habit) => {
          const status = trackMap.get(`${habit._id}|${dateStr}`) || 'missed';
          if (status === 'completed')    completed++;
          else if (status === 'skipped') skipped++;
          else                           missed++;
        });

        const scheduled = scheduledHabits.length;
        const active = completed + missed;
        const allSkipped = skipped === scheduled;
        const completionRate = active > 0
          ? Math.round((completed / active) * 100)
          : null;

        dailyData.push({
          date: dateStr,
          label: dayCursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          scheduled,
          completed,
          missed,
          skipped,
          active,
          allSkipped,
          completionRate,
          rate: completionRate ?? 0,
        });
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    // ── Overall summary ────────────────────────────────────────────────────────
    const totalCompleted = habitStats.reduce((s, h) => s + h.completedDays, 0);
    const totalMissed    = habitStats.reduce((s, h) => s + h.missedDays, 0);
    const totalSkipped   = habitStats.reduce((s, h) => s + h.skippedDays, 0);
    const totalScheduled = habitStats.reduce((s, h) => s + h.scheduledDays, 0);

    const totalActive = totalCompleted + totalMissed;
    const overallRate = totalActive > 0
      ? Math.round((totalCompleted / totalActive) * 100)
      : null;

    const sorted = [...habitStats].sort(
      (a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0)
    );

    const result = {
      overallRate,
      totalCompleted,
      totalMissed,
      totalSkipped,
      totalScheduled,
      mostConsistent: sorted[0] || null,
      leastFollowed:  sorted[sorted.length - 1] || null,
      habitStats,
      dailyData,
    };

    // ── Cache and respond ──────────────────────────────────────────────────────
    setCached(String(userId), result);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export router as default + bustCache as named export
// NOTE: module.exports = router would overwrite bustCache, so we attach it after.
module.exports = router;
module.exports.bustCache = bustCache;
