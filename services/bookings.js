const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { todayBangkok, validateRentalDates } = require('../utils/dates');
const { calculateTotal } = require('../utils/money');
const { serializeVehicleSnapshot } = require('../serializers/vehicles');
const { requireApprovedCompany } = require('./companyAccess');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function assertBookingRole(actor) {
  if (!actor || !['user', 'admin'].includes(actor.role)) {
    fail(403, 'This account cannot access customer bookings.');
  }
}

function bookingScope(actor) {
  assertBookingRole(actor);
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

async function listForFilter(filter, filters, today) {
  const total = await Booking.countDocuments(filter);
  const data = await Booking.find(filter).sort({ createdAt: -1, _id: -1 })
    .skip((filters.page - 1) * filters.limit).limit(filters.limit)
    .populate('userId', 'name email telephone');
  return { data, count: data.length, today, pagination: {
    page: filters.page, limit: filters.limit, total, pages: Math.ceil(total / filters.limit),
  } };
}

async function listBookings(filters, ctx) {
  const today = todayBangkok(ctx.clock ? ctx.clock.now() : new Date());
  const filter = { ...bookingScope(ctx.actor), ...statusFilter(filters.status, today) };
  if (ctx.actor.role === 'admin') {
    if (filters.userId) {
      filter.userId = filters.userId;
    }
    if (filters.providerId) {
      filter.providerId = filters.providerId;
    }
  }
  return listForFilter(filter, filters, today);
}

async function getBooking(id, ctx) {
  const booking = await Booking.findOne({ _id: id, ...bookingScope(ctx.actor) })
    .populate('userId', 'name email telephone');
  if (!booking) {
    fail(404, 'The booking was not found.');
  }
  return booking;
}

async function assertEligibility(provider, vehicle, startDate, dueDate, session) {
  const profile = provider && await ProviderApplication.exists({ _id: provider.approvedApplicationId,
    providerId: provider._id, status: 'approved' }).session(session);
  if (!provider || provider.status !== 'approved' || !profile || !vehicle.isActive ||
      String(vehicle.providerId) !== String(provider._id)) {
    fail(409, 'This vehicle is not available for booking.');
  }
  if (startDate < vehicle.availableFrom || (vehicle.availableUntil !== null && dueDate > vehicle.availableUntil)) {
    fail(409, 'The rental must fit inside the vehicle offering period.');
  }
}

async function checkCapAndOverlap(userId, vehicle, startDate, dueDate, today, excludeId, session) {
  const ownerFilter = { userId, state: 'confirmed', dueDate: { $gte: today } };
  const overlapFilter = { vehicleId: vehicle._id, providerId: vehicle.providerId, state: 'confirmed',
    startDate: { $lte: dueDate }, dueDate: { $gte: startDate } };
  if (excludeId) {
    ownerFilter._id = { $ne: excludeId };
    overlapFilter._id = { $ne: excludeId };
  }
  if (await Booking.countDocuments(ownerFilter).session(session) >= 3) {
    fail(409, 'A customer can have at most three upcoming or ongoing bookings.');
  }
  if (await Booking.exists(overlapFilter).session(session)) {
    fail(409, 'This vehicle is already booked for those dates.');
  }
}

async function writeBooking(id, input, ctx, operation) {
  const actor = ctx.actor;
  assertBookingRole(actor);
  if (operation === 'create' && actor.role !== 'user') {
    fail(403, 'Only customers can create bookings.');
  }
  let references;
  if (operation === 'create') {
    const selected = await Vehicle.findById(input.vehicleId).select('providerId');
    if (!selected) {
      fail(409, 'This vehicle is not available for booking.');
    }
    references = { providerId: selected.providerId, vehicleId: selected._id, userId: actor.userId };
  } else {
    references = await Booking.findOne({ _id: id, ...bookingScope(actor) }).select('providerId vehicleId userId');
    if (!references) {
      fail(404, 'The booking was not found.');
    }
  }
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const now = ctx.clock ? ctx.clock.now() : new Date();
      const today = todayBangkok(now);
      // The shared user guard enforces the cap even across different providers.
      const provider = await Provider.findByIdAndUpdate(references.providerId,
        { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
      if (!provider) {
        fail(404, 'The booking provider was not found.');
      }
      const user = await User.findOneAndUpdate({ _id: references.userId },
        { $inc: { bookingRevision: 1 } }, { session, returnDocument: 'after' });
      const vehicle = await Vehicle.findOneAndUpdate({ _id: references.vehicleId, providerId: provider._id },
        { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
      if (!user || !vehicle) {
        fail(404, 'The booking target was not found.');
      }
      let booking;
      if (id) {
        booking = await Booking.findOne({ _id: id, ...bookingScope(actor),
          userId: references.userId, providerId: provider._id, vehicleId: vehicle._id }).session(session);
        if (!booking) {
          fail(404, 'The booking was not found.');
        }
        if (booking.state === 'cancelled') {
          if (operation === 'cancel') {
            result = booking;
            return;
          }
          fail(409, 'A cancelled booking cannot be changed.');
        }
        if (operation === 'cancel') {
          if (booking.dueDate < today || (actor.role === 'user' && booking.startDate <= today)) {
            fail(409, 'This booking can no longer be cancelled by this account.');
          }
          booking.state = 'cancelled';
          booking.cancelledAt = now;
          booking.cancelledBy = actor.userId;
          booking.cancellationReason = actor.role === 'admin' ? 'admin_cancelled' : 'customer_cancelled';
          await booking.save({ session });
          result = booking;
          return;
        }
        if (booking.startDate <= today) {
          fail(409, 'Booking dates can only change before the original start.');
        }
      }
      const rentalDays = validateRentalDates(input.startDate, input.dueDate, today);
      await assertEligibility(provider, vehicle, input.startDate, input.dueDate, session);
      await checkCapAndOverlap(references.userId, vehicle, input.startDate, input.dueDate, today, id, session);
      if (!booking) {
        booking = new Booking({ userId: references.userId, providerId: provider._id, vehicleId: vehicle._id,
          startDate: input.startDate, dueDate: input.dueDate, vehicleSnapshot: serializeVehicleSnapshot(vehicle),
          ratePerDaySatang: vehicle.ratePerDaySatang, rentalDays,
          totalPriceSatang: calculateTotal(vehicle.ratePerDaySatang, rentalDays) });
      } else {
        booking.startDate = input.startDate;
        booking.dueDate = input.dueDate;
        booking.rentalDays = rentalDays;
        booking.totalPriceSatang = calculateTotal(booking.ratePerDaySatang, rentalDays);
      }
      await booking.save({ session });
      result = booking;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, timeoutMS: 2500 });
    result.$session(null);
    await result.populate('userId', 'name email telephone');
    return result;
  } catch (error) {
    if (!error.hasErrorLabel?.('UnknownTransactionCommitResult') && error.hasErrorLabel?.('TransientTransactionError')) {
      fail(409, 'The booking changed during this request. Try again.');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function createBooking(input, ctx) {
  return writeBooking(null, input, ctx, 'create');
}
function updateBookingDates(id, input, ctx) {
  return writeBooking(id, input, ctx, 'dates');
}
function cancelBooking(id, ctx) {
  return writeBooking(id, null, ctx, 'cancel');
}


async function listCompanyBookings(filters, ctx) {
  await requireApprovedCompany(ctx.actor);
  if (filters.vehicleId && !(await Vehicle.exists({ _id: filters.vehicleId, providerId: ctx.actor.providerId }))) {
    fail(404, 'The vehicle was not found.');
  }
  const today = todayBangkok(ctx.clock ? ctx.clock.now() : new Date());
  const filter = { providerId: ctx.actor.providerId, ...statusFilter(filters.status, today) };
  if (filters.vehicleId) {
    filter.vehicleId = filters.vehicleId;
  }
  return listForFilter(filter, filters, today);
}

async function getCompanyBooking(id, ctx) {
  await requireApprovedCompany(ctx.actor);
  const booking = await Booking.findOne({ _id: id, providerId: ctx.actor.providerId })
    .populate('userId', 'name email telephone');
  if (!booking) {
    fail(404, 'The booking was not found.');
  }
  return booking;
}
module.exports = { createBooking, updateBookingDates, cancelBooking, getBooking, listBookings,
  listCompanyBookings, getCompanyBooking };
