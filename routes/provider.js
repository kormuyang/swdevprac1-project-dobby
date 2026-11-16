const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getOwnProvider,
  listOwnApplications,
  submitApplication,
  getOwnApplication,
} = require('../controllers/providers');

const router = express.Router();
router.use(protect(), authorize('provider'));
router.get('/profile', getOwnProvider);
router.get('/applications', listOwnApplications);
router.post('/applications', submitApplication);
router.get('/applications/:applicationId', getOwnApplication);

module.exports = router;
