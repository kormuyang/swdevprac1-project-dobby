const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');

const router = express.Router();


const parseJson = express.json({ limit: '16kb' });

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({ success: false, message: 'Too many authentication attempts. Try again later.' });
  },
});

router.post('/register', authRateLimit, parseJson, rejectQuery, authController.registerCustomer);
router.post('/register-company', authRateLimit, parseJson, rejectQuery, authController.registerCompany);
router.post('/login', authRateLimit, parseJson, rejectQuery, authController.login);
router.post('/logout', protect({ allowSuspended: true }), parseJson, rejectQuery, rejectBody, authController.logout);
router.get('/me', protect(), parseJson, rejectQuery, rejectBody, authController.getMe);

router.use((error, req, res, next) => {
  if (error?.status >= 400 && error.status < 500) {
    const message = error.type === 'entity.too.large'
      ? 'Request body is too large.'
      : 'Request body must contain valid JSON.';
    return res.status(400).json({ success: false, message });
  }
  return res.status(500).json({ success: false, message: 'The request could not be completed.' });
});

module.exports = router;
