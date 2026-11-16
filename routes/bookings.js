const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBookingDates,
  cancelBooking,
} = require('../controllers/bookings');

const router = express.Router();
router.use(protect());
router.post('/', authorize('user'), createBooking);
router.get('/', authorize('user', 'admin'), listBookings);
router.get('/:bookingId', authorize('user', 'admin'), getBooking);
router.patch('/:bookingId', authorize('user', 'admin'), updateBookingDates);
router.delete('/:bookingId', authorize('user', 'admin'), cancelBooking);

module.exports = router;
