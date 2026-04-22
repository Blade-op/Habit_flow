const express = require('express');
const User = require('../models/User');
const Habit = require('../models/Habit');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — list all users with basic stats
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    // Attach habit count per user
    const habitCounts = await Habit.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    habitCounts.forEach(({ _id, count }) => { countMap[_id?.toString()] = count; });

    const result = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      adminSince: u.adminSince,
      createdAt: u.createdAt,
      habitCount: countMap[u._id.toString()] || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/admin/users/:id/make-admin — promote a user to admin
router.patch('/users/:id/make-admin', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: true, adminSince: new Date() },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      adminSince: user.adminSince,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/admin/users/:id/remove-admin — demote an admin back to user
router.patch('/users/:id/remove-admin', async (req, res) => {
  try {
    // Prevent self-demotion
    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: false, adminSince: null },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
