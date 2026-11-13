const mongoose = require('mongoose');
const User = require('../models/User');

async function cancelNonCompletedForProvider({ providerId, actorId, today, now, session }) {
  if (!session || !session.inTransaction()) {
    throw new Error('Booking cancellation requires the caller transaction.');
  }
  const bookings = mongoose.connection.collection('bookings');
  const vehicles = mongoose.connection.collection('vehicles');
  const providerObjectId = new mongoose.Types.ObjectId(providerId);
  const filter = { providerId: providerObjectId, state: 'confirmed', dueDate: { $gte: today } };
  const affected = await bookings.find(filter, { session, projection: { userId: 1, vehicleId: 1 } }).toArray();
  const userIds = [...new Set(affected.map((booking) => String(booking.userId)))].sort();
  const vehicleIds = [...new Set(affected.map((booking) => String(booking.vehicleId)))].sort();

  // The caller holds the provider guard. All booking writers must take these same guards.
  for (const userId of userIds) {
    const result = await User.updateOne({ _id: userId }, { $inc: { bookingRevision: 1 } }, { session });
    if (result.matchedCount !== 1) {
      const error = new Error('A booking customer was not found.');
      error.status = 404;
      throw error;
    }
  }
  for (const vehicleId of vehicleIds) {
    const result = await vehicles.updateOne(
      { _id: new mongoose.Types.ObjectId(vehicleId), providerId: providerObjectId },
      { $inc: { revision: 1 } },
      { session },
    );
    if (result.matchedCount !== 1) {
      const error = new Error('A booked vehicle was not found.');
      error.status = 404;
      throw error;
    }
  }
  const result = await bookings.updateMany(filter, {
    $set: {
      state: 'cancelled',
      cancellationReason: 'provider_suspended',
      cancelledBy: new mongoose.Types.ObjectId(actorId),
      cancelledAt: now,
    },
  }, { session });
  return { cancelledBookingCount: result.modifiedCount };
}

module.exports = { cancelNonCompletedForProvider };
