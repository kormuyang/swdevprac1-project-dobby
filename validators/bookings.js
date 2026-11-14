const { inclusiveDays } = require('../utils/dates');
const { requireObject, rejectUnknownFields, objectIdField } = require('./fields');

function validateBookingDatesUpdate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, ['startDate', 'dueDate'], 'request');
  // Cutoff and new-rental rules run in B03 after the existing booking is checked.
  inclusiveDays(body.startDate, body.dueDate);
  return { startDate: body.startDate, dueDate: body.dueDate };
}

function validateBookingCreate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, ['vehicleId', 'startDate', 'dueDate'], 'request');
  return {
    vehicleId: objectIdField(body.vehicleId, 'vehicleId'),
    ...validateBookingDatesUpdate({ startDate: body.startDate, dueDate: body.dueDate }),
  };
}

module.exports = { validateBookingCreate, validateBookingDatesUpdate };
