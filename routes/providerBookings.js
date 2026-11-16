const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listProviderBookings, getProviderBooking } = require('../controllers/bookings');

const router = express.Router();
router.use(protect(), authorize('provider'));
router.get('/', listProviderBookings);
router.get('/:bookingId', getProviderBooking);

module.exports = router;
