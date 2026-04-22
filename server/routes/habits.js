const express = require('express');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth'); // [ADDED] strict auth guard

const router = express.Router();

// Apply requireAuth to ALL habit routes
router.use(requireAuth); // [ADDED]

// GET /api/habits — only habits belonging to the logged-in user
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId }).sort({ createdAt: 1 }); // [MODIFIED] scoped by userId
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/habits
router.post('/', async (req, res) => {
  try {
    const { title, description, frequency, days, color, target } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    const habit = await Habit.create({
      title,
      description: description || '',
      frequency: frequency || 'daily',
      days: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : (days || [0, 1, 2, 3, 4, 5, 6]),
      color: color || '#a78bfa',
      target: target || '',
      userId: req.userId, // [MODIFIED] always set from authenticated user
    });

    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/habits/:id — only allow editing own habits
router.put('/:id', async (req, res) => {
  try {
    const { title, description, frequency, days, color, target } = req.body;
    const updateData = { title, description, frequency, color, target };
    if (frequency === 'daily') {
      updateData.days = [0, 1, 2, 3, 4, 5, 6];
    } else {
      updateData.days = days || [0, 1, 2, 3, 4, 5, 6];
    }

    // [MODIFIED] added userId to query so users can only edit their own habits
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/habits/:id — only allow deleting own habits
router.delete('/:id', async (req, res) => {
  try {
    // [MODIFIED] scoped by userId
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });
    res.json({ message: 'Habit deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
