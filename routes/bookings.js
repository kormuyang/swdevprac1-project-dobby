const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBookingDates,
  cancelBooking,
  listProviderBookings,
  getProviderBooking,
} = require('../controllers/bookings');

const router = express.Router();

router
  .route('/bookings')
  .all(protect())
  .get(authorize('user', 'admin'), listBookings)
  .post(authorize('user'), createBooking);
router
  .route('/bookings/:bookingId')
  .all(protect(), authorize('user', 'admin'))
  .get(getBooking)
  .patch(updateBookingDates)
  .delete(cancelBooking);

router.route('/provider/bookings').all(protect(), authorize('provider')).get(listProviderBookings);
router
  .route('/provider/bookings/:bookingId')
  .all(protect(), authorize('provider'))
  .get(getProviderBooking);

module.exports = router;
