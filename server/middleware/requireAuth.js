const jwt = require('jsonwebtoken');

/**
 * requireAuth — strict middleware that BLOCKS requests with no/invalid token.
 * Use this on all protected routes (habits, track, analytics).
 * The global authMiddleware in auth.js still runs first and sets req.userId.
 */
const requireAuth = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  next();
};

module.exports = requireAuth;
