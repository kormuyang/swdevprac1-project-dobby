const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { suspendProvider, reactivateProvider } = require('../controllers/providerLifecycle');

const router = express.Router();
router.use(protect(), authorize('admin'), express.json({ limit: '16kb' }));
router.post('/:providerId/suspend', suspendProvider);
router.post('/:providerId/reactivate', reactivateProvider);
router.use((error, req, res, next) => {
  const status = error.status >= 400 && error.status < 500 ? 400 : 500;
  return res.status(status).json({
    success: false,
    message: status === 400 ? 'Invalid request body.' : 'The request could not be completed.',
  });
});
module.exports = router;
