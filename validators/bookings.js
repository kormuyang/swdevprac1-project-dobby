const { listPage } = require('./rentalLists');
const { inclusiveDays } = require('../utils/dates');
const { requireObject, rejectUnknownFields, objectIdField, enumField } = require('./fields');

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

function validateBookingFilters(query, today, actor) {
  const fields = ['status'];
  if (actor?.role === 'admin') {
    fields.push('providerId', 'userId');
  }
  const result = listPage(query, fields);
  if (query.status !== undefined) {
    result.status = enumField(query.status, 'status', [
      'upcoming',
      'ongoing',
      'completed',
      'cancelled',
    ]);
  }
  for (const field of ['providerId', 'userId']) {
    if (query[field] !== undefined) {
      result[field] = objectIdField(query[field], field);
    }
  }
  return result;
}

function validateProviderBookingFilters(query) {
  const result = listPage(query, ['status', 'vehicleId']);
  if (query.status !== undefined) {
    result.status = enumField(query.status, 'status', [
      'upcoming',
      'ongoing',
      'completed',
      'cancelled',
    ]);
  }
  if (query.vehicleId !== undefined) {
    result.vehicleId = objectIdField(query.vehicleId, 'vehicleId');
  }
  return result;
}
module.exports = {
  validateBookingCreate,
  validateBookingDatesUpdate,
  validateBookingFilters,
  validateProviderBookingFilters,
};
