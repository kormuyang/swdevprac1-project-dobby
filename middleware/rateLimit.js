const { rateLimit } = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Try again later.',
    });
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again later.',
    });
  },
});

module.exports = { apiRateLimiter, authRateLimiter };
