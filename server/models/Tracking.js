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
  // NEW: 3-state status system
  // Backward-compat: old docs may have `completed: Boolean` — routes handle shim
  status: {
    type: String,
    enum: ['completed', 'missed', 'skipped'],
    default: 'missed',
  },
  // NEW: true when this record was created as part of a full-day skip
  isDaySkipped: {
    type: Boolean,
    default: false,
  },
  // Legacy field — kept so old documents still deserialize correctly
  completed: {
    type: Boolean,
    default: false,
  },
});

// Ensure unique tracking per habit per date (also serves as primary lookup index)
TrackingSchema.index({ habitId: 1, date: 1 }, { unique: true });
// Covering index for analytics date-range queries (fetches status without extra document read)
TrackingSchema.index({ habitId: 1, date: 1, status: 1 });
// Index for day-level queries (e.g. skip-day lookup by date)
TrackingSchema.index({ date: 1, status: 1 });

// Virtual helper: resolve effective status respecting legacy `completed` field
TrackingSchema.virtual('effectiveStatus').get(function () {
  if (this.status && this.status !== 'missed') return this.status;
  // Backward-compat: if status is still default 'missed' but legacy completed=true
  if (this.completed) return 'completed';
  return this.status || 'missed';
});

module.exports = mongoose.model('Tracking', TrackingSchema);
