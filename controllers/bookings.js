const AppError = require('../utils/AppError');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const service = require('../services/bookings');
const { todayBangkok } = require('../utils/dates');
const { serializeBooking } = require('../serializers/bookings');

function bookingScope(actor) {
  if (!actor || !['user', 'admin'].includes(actor.role)) {
    throw new AppError(403, 'This account cannot access customer bookings.');
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

async function listBookings(req, res, next) {
  try {
    const today = todayBangkok(new Date());
    const filters = req.validated.query;
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
    return next(error);
  }
}

async function getBooking(req, res, next) {
  try {
    const bookingId = req.validated.params.bookingId;
    const booking = await Booking.findOne({
      _id: bookingId,
      ...bookingScope(req.actor),
    }).populate('userId', 'name email telephone');
    if (!booking) {
      throw new AppError(404, 'The booking was not found.');
    }
    const today = todayBangkok(new Date());
    const data = serializeBooking(booking, booking.userId, today);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const input = req.validated.body;
    const now = new Date();
    const booking = await service.createBooking(input, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingDates(req, res, next) {
  try {
    const bookingId = req.validated.params.bookingId;
    const input = req.validated.body;
    const now = new Date();
    const booking = await service.updateBookingDates(bookingId, input, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const bookingId = req.validated.params.bookingId;
    const now = new Date();
    const booking = await service.cancelBooking(bookingId, req.actor, now);
    const data = serializeBooking(booking, booking.userId, todayBangkok(now));
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listProviderBookings(req, res, next) {
  try {
    const filters = req.validated.query;
    if (filters.vehicleId) {
      const vehicle = await Vehicle.exists({
        _id: filters.vehicleId,
        providerId: req.actor.providerId,
      });
      if (!vehicle) {
        throw new AppError(404, 'The vehicle was not found.');
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
    return next(error);
  }
}

async function getProviderBooking(req, res, next) {
  try {
    const bookingId = req.validated.params.bookingId;
    const booking = await Booking.findOne({
      _id: bookingId,
      providerId: req.actor.providerId,
    }).populate('userId', 'name email telephone');
    if (!booking) {
      throw new AppError(404, 'The booking was not found.');
    }
    const today = todayBangkok(new Date());
    const data = serializeBooking(booking, booking.userId, today);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
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
