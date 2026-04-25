const express = require('express');
const Tracking = require('../models/Tracking');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth');
const { bustCache } = require('./analytics');

const router = express.Router();

// Apply requireAuth to ALL tracking routes
router.use(requireAuth);

// Helper: resolve effective status with backward-compat for legacy `completed` boolean
function resolveStatus(record) {
  if (!record) return 'missed';
  // If status is explicitly set to completed or skipped, trust it
  if (record.status === 'completed' || record.status === 'skipped') return record.status;
  // Fallback for old documents that only have completed:Boolean
  if (record.completed === true) return 'completed';
  return 'missed';
}

// POST /api/track — Set status for a habit on a date
// Body: { habitId, date, status: 'completed'|'missed'|'skipped' }
router.post('/', async (req, res) => {
  try {
    const { habitId, date, status } = req.body;

    if (!habitId || !date)
      return res.status(400).json({ message: 'habitId and date are required.' });

    // Validate status
    const validStatuses = ['completed', 'missed', 'skipped'];
    const newStatus = validStatuses.includes(status) ? status : 'completed';

    // Verify the habit belongs to the logged-in user — select only _id
    const habit = await Habit.findOne({ _id: habitId, userId: req.userId }).select('_id').lean();
    if (!habit)
      return res.status(403).json({ message: 'Habit not found or access denied.' });

    const record = await Tracking.findOneAndUpdate(
      { habitId, date },
      {
        status: newStatus,
        completed: newStatus === 'completed',
        isDaySkipped: false,
      },
      { upsert: true, new: true }
    );

    // Bust analytics cache so next visit reflects the change
    bustCache(req.userId);

    res.json({ ...record.toObject(), effectiveStatus: resolveStatus(record) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/track/skip-day — Mark ALL habits for a given date as skipped
// Body: { date, habitIds: [id, id, ...] }
router.post('/skip-day', async (req, res) => {
  try {
    const { date, habitIds } = req.body;

    if (!date || !Array.isArray(habitIds) || habitIds.length === 0)
      return res.status(400).json({ message: 'date and habitIds[] are required.' });

    // Verify all habits belong to the logged-in user — select only _id
    const userHabits = await Habit.find({ _id: { $in: habitIds }, userId: req.userId })
      .select('_id')
      .lean();
    const ownedIds = userHabits.map((h) => h._id.toString());

    if (ownedIds.length === 0)
      return res.status(403).json({ message: 'No owned habits found for the given IDs.' });

    const ops = ownedIds.map((habitId) => ({
      updateOne: {
        filter: { habitId, date },
        update: { $set: { status: 'skipped', completed: false, isDaySkipped: true } },
        upsert: true,
      },
    }));

    await Tracking.bulkWrite(ops);

    // Bust analytics cache
    bustCache(req.userId);

    const records = await Tracking.find({ habitId: { $in: ownedIds }, date }).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/track?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, habitId } = req.query;

    // Only return tracking for habits owned by this user — select only _id
    const userHabits = await Habit.find({ userId: req.userId }).select('_id').lean();
    const userHabitIds = userHabits.map((h) => h._id);

    const query = { habitId: { $in: userHabitIds } };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (habitId) {
      query.habitId = habitId;
    }

    // .lean() + .select() — returns plain objects with only needed fields
    const records = await Tracking.find(query)
      .select('habitId date status completed isDaySkipped')
      .lean();

    // Add effectiveStatus and stringify ObjectId for the frontend
    const enriched = records.map((r) => ({
      ...r,
      habitId: r.habitId.toString(),
      effectiveStatus: resolveStatus(r),
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
