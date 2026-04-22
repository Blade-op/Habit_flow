const mongoose = require('mongoose');

const TrackingSchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
  },
  date: {
    type: String, // stored as YYYY-MM-DD string for easy querying
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

// Ensure unique tracking per habit per date
TrackingSchema.index({ habitId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Tracking', TrackingSchema);
