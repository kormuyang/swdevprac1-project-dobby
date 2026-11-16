const { rejectBody, rejectQuery } = require('../validators/request');
const { objectIdField } = require('../validators/fields');
const {
  validateBookingCreate,
  validateBookingDatesUpdate,
  validateBookingFilters,
  validateProviderBookingFilters,
} = require('../validators/bookings');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const service = require('../services/bookings');
const { requireApprovedProvider } = require('../services/providerAccess');
const { todayBangkok } = require('../utils/dates');
const { serializeBooking } = require('../serializers/bookings');

function bookingScope(actor) {
  if (!actor || !['user', 'admin'].includes(actor.role)) {
    const error = new Error('This account cannot access customer bookings.');
    error.status = 403;
    throw error;
  }
  if (actor.role === 'admin') {
    return {};
  }
  return { userId: actor.userId };
}

function statusFilter(status, today) {
  if (status === 'cancelled') {
    return { state: 'cancelled' };
  }
  if (status === 'completed') {
    return { state: 'confirmed', dueDate: { $lt: today } };
  }
  if (status === 'ongoing') {
    return { state: 'confirmed', startDate: { $lte: today }, dueDate: { $gte: today } };
  }
  if (status === 'upcoming') {
    return { state: 'confirmed', startDate: { $gt: today } };
  }
  return {};
}

async function bookingPage(filter, filters, today) {
  const total = await Booking.countDocuments(filter);
  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit)
    .populate('userId', 'name email telephone');
  const data = bookings.map((booking) => serializeBooking(booking, booking.userId, today));
  return {
    success: true,
    data,
    count: data.length,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

async function listBookings(req, res) {
  try {
    rejectBody(req);
    const today = todayBangkok(new Date());
    const filters = validateBookingFilters(req.query, today, req.actor);
    const filter = {
      ...bookingScope(req.actor),
      ...statusFilter(filters.status, today),
    };
    if (req.actor.role === 'admin') {
      if (filters.userId) {
        filter.userId = filters.userId;
      }
      if (filters.providerId) {
        filter.providerId = filters.providerId;
      }
    }
    const result = await bookingPage(filter, filters, today);
    return res.json(result);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function getBooking(req, res) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    const booking = await Booking.findOne({
      _id: bookingId,
      ...bookingScope(req.actor),
    }).populate('userId', 'name email telephone');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'The booking was not found.' });
    }
    const today = todayBangkok(new Date());
    const data = serializeBooking(booking, booking.userId, today);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function createBooking(req, res) {
  try {
    rejectQuery(req);
    const input = validateBookingCreate(req.body);
    const now = new Date();
    const booking = await service.createBooking(input, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function updateBookingDates(req, res) {
  try {
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    const input = validateBookingDatesUpdate(req.body);
    const now = new Date();
    const booking = await service.updateBookingDates(bookingId, input, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function cancelBooking(req, res) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    const now = new Date();
    const booking = await service.cancelBooking(bookingId, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function listProviderBookings(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectBody(req);
    const filters = validateProviderBookingFilters(req.query);
    if (filters.vehicleId) {
      const vehicle = await Vehicle.exists({
        _id: filters.vehicleId,
        providerId: req.actor.providerId,
      });
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'The vehicle was not found.' });
      }
    }
    const today = todayBangkok(new Date());
    const filter = {
      providerId: req.actor.providerId,
      ...statusFilter(filters.status, today),
    };
    if (filters.vehicleId) {
      filter.vehicleId = filters.vehicleId;
    }
    const result = await bookingPage(filter, filters, today);
    return res.json(result);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function getProviderBooking(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectBody(req);
    rejectQuery(req);
    const bookingId = objectIdField(req.params.bookingId, 'bookingId');
    const booking = await Booking.findOne({
      _id: bookingId,
      providerId: req.actor.providerId,
    }).populate('userId', 'name email telephone');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'The booking was not found.' });
    }
    const today = todayBangkok(new Date());
    const data = serializeBooking(booking, booking.userId, today);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

module.exports = {
  listBookings,
  getBooking,
  createBooking,
  updateBookingDates,
  cancelBooking,
  listProviderBookings,
  getProviderBooking,
};
