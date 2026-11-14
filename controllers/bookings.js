const service = require('../services/bookings');
const { todayBangkok } = require('../utils/dates');
const { serializeBooking } = require('../serializers/bookings');

function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({ success: false,
    message: status < 500 ? error.message : 'The request could not be completed.' });
}
function bookingDto(booking, today = todayBangkok(new Date())) {
  return serializeBooking(booking, booking.userId, today);
}
async function listBookings(req, res) {
  try {
    const result = await service.listBookings(req.filters, { actor: req.actor });
    return res.json({ success: true, data: result.data.map((booking) => bookingDto(booking, result.today)),
      count: result.count, pagination: result.pagination });
  } catch (error) {
    return sendError(res, error);
  }
}
async function getBooking(req, res) {
  try {
    return res.json({ success: true, data: bookingDto(await service.getBooking(req.resourceId, { actor: req.actor })) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function createBooking(req, res) {
  try {
    return res.status(201).json({ success: true, data: bookingDto(await service.createBooking(req.input, { actor: req.actor })) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function updateBookingDates(req, res) {
  try {
    return res.json({ success: true, data: bookingDto(await service.updateBookingDates(req.resourceId, req.input, { actor: req.actor })) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function cancelBooking(req, res) {
  try {
    return res.json({ success: true, data: bookingDto(await service.cancelBooking(req.resourceId, { actor: req.actor })) });
  } catch (error) {
    return sendError(res, error);
  }
}
module.exports = { listBookings, getBooking, createBooking, updateBookingDates, cancelBooking };
