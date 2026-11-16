const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listPublicProviders, getPublicProvider } = require('../controllers/vehicles');
const {
  getOwnProvider,
  listOwnApplications,
  submitApplication,
  getOwnApplication,
  listAdminProviders,
  getAdminProvider,
  listAdminApplications,
  getAdminApplication,
  reviewApplication,
} = require('../controllers/providers');
const { suspendProvider, reactivateProvider } = require('../controllers/providerLifecycle');

const router = express.Router();

router.route('/providers').get(listPublicProviders);
router.route('/providers/:providerId').get(getPublicProvider);

router.route('/provider/profile').all(protect(), authorize('provider')).get(getOwnProvider);
router
  .route('/provider/applications')
  .all(protect(), authorize('provider'))
  .get(listOwnApplications)
  .post(submitApplication);
router
  .route('/provider/applications/:applicationId')
  .all(protect(), authorize('provider'))
  .get(getOwnApplication);

router.route('/admin/providers').all(protect(), authorize('admin')).get(listAdminProviders);
router
  .route('/admin/providers/:providerId')
  .all(protect(), authorize('admin'))
  .get(getAdminProvider);
router.route('/admin/applications').all(protect(), authorize('admin')).get(listAdminApplications);
router
  .route('/admin/applications/:applicationId')
  .all(protect(), authorize('admin'))
  .get(getAdminApplication);
router
  .route('/admin/applications/:applicationId/review')
  .all(protect(), authorize('admin'))
  .post(reviewApplication);
router
  .route('/admin/providers/:providerId/suspend')
  .all(protect(), authorize('admin'))
  .post(suspendProvider);
router
  .route('/admin/providers/:providerId/reactivate')
  .all(protect(), authorize('admin'))
  .post(reactivateProvider);

module.exports = router;
