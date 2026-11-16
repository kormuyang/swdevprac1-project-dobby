const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { suspendProvider, reactivateProvider } = require('../controllers/providerLifecycle');

const router = express.Router();
router.use(protect(), authorize('admin'));
router.post('/:providerId/suspend', suspendProvider);
router.post('/:providerId/reactivate', reactivateProvider);

module.exports = router;
