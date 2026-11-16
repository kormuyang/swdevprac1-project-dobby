const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listAdminProviders,
  getAdminProvider,
  listAdminApplications,
  getAdminApplication,
  reviewApplication,
} = require('../controllers/providers');

const router = express.Router();
router.use(protect(), authorize('admin'));
router.get('/providers', listAdminProviders);
router.get('/providers/:providerId', getAdminProvider);
router.get('/applications', listAdminApplications);
router.get('/applications/:applicationId', getAdminApplication);
router.post('/applications/:applicationId/review', reviewApplication);

module.exports = router;
