const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');
const { parseJson, validateQuery, validateId, approvedCompany, jsonErrors } = require('../middleware/rentalValidation');
const { validateCompanyBookingFilters } = require('../validators/bookings');
const controller = require('../controllers/bookings');

const router = express.Router();
router.use(protect(), authorize('company'), approvedCompany, parseJson);
router.get('/', rejectBody, validateQuery(validateCompanyBookingFilters), controller.listCompanyBookings);
router.get('/:bookingId', rejectBody, rejectQuery, validateId('bookingId'), controller.getCompanyBooking);
router.use(jsonErrors);
module.exports = router;
