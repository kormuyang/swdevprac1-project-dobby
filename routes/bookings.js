const {
  validateListBookings,
  validateGetBooking,
  validateCreateBooking,
  validateUpdateBookingDates,
  validateCancelBooking,
  validateListProviderBookings,
  validateGetProviderBooking,
} = require('../middleware/bookingsValidation');
const { approvedProvider } = require('../middleware/approvedProvider');
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
  .get(authorize('user', 'admin'), validateListBookings, listBookings)
  .post(authorize('user'), validateCreateBooking, createBooking);
router
  .route('/bookings/:bookingId')
  .all(protect(), authorize('user', 'admin'))
  .get(validateGetBooking, getBooking)
  .patch(validateUpdateBookingDates, updateBookingDates)
  .delete(validateCancelBooking, cancelBooking);

router
  .route('/provider/bookings')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateListProviderBookings, listProviderBookings);
router
  .route('/provider/bookings/:bookingId')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateGetProviderBooking, getProviderBooking);

module.exports = router;
