const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  validateListBookings,
  validateGetBooking,
  validateCreateBooking,
  validateUpdateBookingDates,
  validateCancelBooking,
} = require('../middleware/bookingsValidation');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBookingDates,
  cancelBooking,
} = require('../controllers/bookings');

const router = express.Router();

router
  .route('/')
  .all(protect())
  .get(authorize('user', 'admin'), validateListBookings, listBookings)
  .post(authorize('user'), validateCreateBooking, createBooking);

router
  .route('/:bookingId')
  .all(protect(), authorize('user', 'admin'))
  .get(validateGetBooking, getBooking)
  .patch(validateUpdateBookingDates, updateBookingDates)
  .delete(validateCancelBooking, cancelBooking);

module.exports = router;
