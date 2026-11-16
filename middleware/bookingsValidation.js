const { rejectBody, rejectQuery } = require('../validators/request');
const { objectIdField } = require('../validators/fields');
const {
  validateBookingCreate,
  validateBookingDatesUpdate,
  validateBookingFilters,
  validateProviderBookingFilters,
} = require('../validators/bookings');

function validateListBookings(req, res, next) {
  try {
    rejectBody(req);
    const filters = validateBookingFilters(req.query, req.actor);
    req.validated = { query: filters };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetBooking(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    req.validated = { params: { bookingId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCreateBooking(req, res, next) {
  try {
    rejectQuery(req);
    const input = validateBookingCreate(req.body);
    req.validated = { body: input };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateBookingDates(req, res, next) {
  try {
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    const input = validateBookingDatesUpdate(req.body);
    req.validated = { body: input, params: { bookingId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCancelBooking(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    req.validated = { params: { bookingId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListProviderBookings(req, res, next) {
  try {
    rejectBody(req);
    const filters = validateProviderBookingFilters(req.query);
    req.validated = { query: filters };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetProviderBooking(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    req.validated = { params: { bookingId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateListBookings,
  validateGetBooking,
  validateCreateBooking,
  validateUpdateBookingDates,
  validateCancelBooking,
  validateListProviderBookings,
  validateGetProviderBooking,
};
