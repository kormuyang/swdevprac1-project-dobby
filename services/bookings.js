const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { todayBangkok, validateRentalDates } = require('../utils/dates');
const { calculateTotal } = require('../utils/money');
const { serializeVehicleSnapshot } = require('../serializers/vehicles');

function fail(status, message) {
  throw new AppError(status, message);
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

async function assertEligibility(provider, vehicle, startDate, dueDate, session) {
  const profile =
    provider &&
    (await ProviderApplication.exists({
      _id: provider.approvedApplicationId,
      providerId: provider._id,
      status: 'approved',
    }).session(session));
  if (
    !provider ||
    provider.status !== 'approved' ||
    !profile ||
    !vehicle.isActive ||
    String(vehicle.providerId) !== String(provider._id)
  ) {
    fail(409, 'This vehicle is not available for booking.');
  }
  if (
    startDate < vehicle.availableFrom ||
    (vehicle.availableUntil !== null && dueDate > vehicle.availableUntil)
  ) {
    fail(409, 'The rental must fit inside the vehicle offering period.');
  }
}

async function checkCapAndOverlap(userId, vehicle, startDate, dueDate, today, excludeId, session) {
  const ownerFilter = { userId, state: 'confirmed', dueDate: { $gte: today } };
  const overlapFilter = {
    vehicleId: vehicle._id,
    providerId: vehicle.providerId,
    state: 'confirmed',
    startDate: { $lte: dueDate },
    dueDate: { $gte: startDate },
  };
  if (excludeId) {
    ownerFilter._id = { $ne: excludeId };
    overlapFilter._id = { $ne: excludeId };
  }
  if ((await Booking.countDocuments(ownerFilter).session(session)) >= 3) {
    fail(409, 'A customer can have at most three upcoming or ongoing bookings.');
  }
  if (await Booking.exists(overlapFilter).session(session)) {
    fail(409, 'This vehicle is already booked for those dates.');
  }
}

async function lockBookingTargets(references, session) {
  // All booking writers take provider, user and vehicle guards in this order.
  const provider = await Provider.findByIdAndUpdate(
    references.providerId,
    { $inc: { revision: 1 } },
    { session, returnDocument: 'after' },
  );
  if (!provider) {
    fail(404, 'The booking provider was not found.');
  }
  // The user guard enforces the cap even across different providers.
  const user = await User.findOneAndUpdate(
    { _id: references.userId },
    { $inc: { bookingRevision: 1 } },
    { session, returnDocument: 'after' },
  );
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: references.vehicleId, providerId: provider._id },
    { $inc: { revision: 1 } },
    { session, returnDocument: 'after' },
  );
  if (!user || !vehicle) {
    fail(404, 'The booking target was not found.');
  }
  return { provider, vehicle };
}

async function writeBooking(id, input, actor, now) {
  assertBookingRole(actor);
  if (!id && actor.role !== 'user') {
    fail(403, 'Only customers can create bookings.');
  }
  let references;
  if (!id) {
    const selected = await Vehicle.findById(input.vehicleId).select('providerId');
    if (!selected) {
      fail(409, 'This vehicle is not available for booking.');
    }
    references = { providerId: selected.providerId, vehicleId: selected._id, userId: actor.userId };
  } else {
    references = await Booking.findOne({ _id: id, ...bookingScope(actor) }).select(
      'providerId vehicleId userId',
    );
    if (!references) {
      fail(404, 'The booking was not found.');
    }
  }
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        const today = todayBangkok(now);
        const { provider, vehicle } = await lockBookingTargets(references, session);
        let booking;
        if (id) {
          booking = await Booking.findOne({
            _id: id,
            ...bookingScope(actor),
            userId: references.userId,
            providerId: provider._id,
            vehicleId: vehicle._id,
          }).session(session);
          if (!booking) {
            fail(404, 'The booking was not found.');
          }
          if (booking.state === 'cancelled') {
            fail(409, 'A cancelled booking cannot be changed.');
          }
          if (booking.startDate <= today) {
            fail(409, 'Booking dates can only change before the original start.');
          }
        }
        const rentalDays = validateRentalDates(input.startDate, input.dueDate, today);
        await assertEligibility(provider, vehicle, input.startDate, input.dueDate, session);
        await checkCapAndOverlap(
          references.userId,
          vehicle,
          input.startDate,
          input.dueDate,
          today,
          id,
          session,
        );
        if (!booking) {
          booking = new Booking({
            userId: references.userId,
            providerId: provider._id,
            vehicleId: vehicle._id,
            startDate: input.startDate,
            dueDate: input.dueDate,
            vehicleSnapshot: serializeVehicleSnapshot(vehicle),
            ratePerDaySatang: vehicle.ratePerDaySatang,
            rentalDays,
            totalPriceSatang: calculateTotal(vehicle.ratePerDaySatang, rentalDays),
          });
        } else {
          booking.startDate = input.startDate;
          booking.dueDate = input.dueDate;
          booking.rentalDays = rentalDays;
          booking.totalPriceSatang = calculateTotal(booking.ratePerDaySatang, rentalDays);
        }
        await booking.save({ session });
        result = booking;
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, timeoutMS: 2500 },
    );
    result.$session(null);
    await result.populate('userId', 'name email telephone');
    return result;
  } catch (error) {
    if (
      !error.hasErrorLabel?.('UnknownTransactionCommitResult') &&
      error.hasErrorLabel?.('TransientTransactionError')
    ) {
      fail(409, 'The booking changed during this request. Try again.');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function createBooking(input, actor, now = new Date()) {
  return writeBooking(null, input, actor, now);
}

function updateBookingDates(id, input, actor, now = new Date()) {
  return writeBooking(id, input, actor, now);
}

async function cancelBooking(id, actor, now = new Date()) {
  const scope = bookingScope(actor);
  const references = await Booking.findOne({ _id: id, ...scope }).select(
    'providerId vehicleId userId',
  );
  if (!references) {
    fail(404, 'The booking was not found.');
  }
  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(
      async () => {
        const today = todayBangkok(now);
        const { provider, vehicle } = await lockBookingTargets(references, session);
        booking = await Booking.findOne({
          _id: id,
          ...scope,
          userId: references.userId,
          providerId: provider._id,
          vehicleId: vehicle._id,
        }).session(session);
        if (!booking) {
          fail(404, 'The booking was not found.');
        }
        if (booking.state === 'cancelled') {
          return;
        }
        if (booking.dueDate < today || (actor.role === 'user' && booking.startDate <= today)) {
          fail(409, 'This booking can no longer be cancelled by this account.');
        }
        booking.state = 'cancelled';
        booking.cancelledAt = now;
        booking.cancelledBy = actor.userId;
        booking.cancellationReason =
          actor.role === 'admin' ? 'admin_cancelled' : 'customer_cancelled';
        await booking.save({ session });
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, timeoutMS: 2500 },
    );
    booking.$session(null);
    await booking.populate('userId', 'name email telephone');
    return booking;
  } catch (error) {
    if (
      !error.hasErrorLabel?.('UnknownTransactionCommitResult') &&
      error.hasErrorLabel?.('TransientTransactionError')
    ) {
      fail(409, 'The booking changed during this request. Try again.');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { createBooking, updateBookingDates, cancelBooking };
