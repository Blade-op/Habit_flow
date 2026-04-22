const express = require('express');
const Tracking = require('../models/Tracking');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth'); // [ADDED]

const router = express.Router();

// Apply requireAuth to ALL tracking routes
router.use(requireAuth); // [ADDED]

// POST /api/track — Toggle completion for a habit on a date
router.post('/', async (req, res) => {
  try {
    const { habitId, date, completed } = req.body;
    if (!habitId || !date)
      return res.status(400).json({ message: 'habitId and date are required.' });

    // [ADDED] Verify the habit belongs to the logged-in user before tracking
    const habit = await Habit.findOne({ _id: habitId, userId: req.userId });
    if (!habit)
      return res.status(403).json({ message: 'Habit not found or access denied.' });

    const record = await Tracking.findOneAndUpdate(
      { habitId, date },
      { completed: completed !== undefined ? completed : true },
      { upsert: true, new: true }
    );

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/track?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, habitId } = req.query;

    // [MODIFIED] Only return tracking for habits owned by this user
    const userHabits = await Habit.find({ userId: req.userId }).select('_id');
    const userHabitIds = userHabits.map((h) => h._id);

    const query = { habitId: { $in: userHabitIds } }; // [MODIFIED]

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (habitId) {
      query.habitId = habitId; // override with specific habit if requested
    }

    const records = await Tracking.find(query);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
