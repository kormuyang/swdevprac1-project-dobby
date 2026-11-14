const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');
const { parseJson, validateBody, validateQuery, validateId, jsonErrors } = require('../middleware/rentalValidation');
const validators = require('../validators/bookings');
const controller = require('../controllers/bookings');

const router = express.Router();
router.use(protect());
router.post('/', authorize('user'), parseJson, rejectQuery, validateBody(validators.validateBookingCreate), controller.createBooking);
router.get('/', authorize('user', 'admin'), parseJson, rejectBody, validateQuery(validators.validateBookingFilters), controller.listBookings);
router.get('/:bookingId', authorize('user', 'admin'), parseJson, rejectBody, rejectQuery, validateId('bookingId'), controller.getBooking);
router.patch('/:bookingId', authorize('user', 'admin'), parseJson, rejectQuery, validateId('bookingId'), validateBody(validators.validateBookingDatesUpdate), controller.updateBookingDates);
router.delete('/:bookingId', authorize('user', 'admin'), parseJson, rejectBody, rejectQuery, validateId('bookingId'), controller.cancelBooking);
router.use(jsonErrors);
module.exports = router;
