const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  frequency: {
    type: String,
    enum: ['daily', 'custom'],
    default: 'daily',
  },
  days: {
    // 0=Sun, 1=Mon, ..., 6=Sat — used when frequency is "custom"
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6],
  },
  color: {
    type: String,
    default: '#a78bfa', // default pastel purple
  },
  target: {
    type: String,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Habit', HabitSchema);
