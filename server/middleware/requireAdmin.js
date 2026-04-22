const User = require('../models/User');

/**
 * requireAdmin — must run AFTER requireAuth.
 * Blocks non-admin users from admin-only endpoints.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('isAdmin');
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = requireAdmin;
