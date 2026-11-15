const { bookingStatus } = require('../utils/dates');
const { serializeVehicleSnapshot } = require('./vehicles');

function serializeBooking(booking, customer, today) {
  const userId = booking.userId?._id || booking.userId;
  // Require the caller to supply the current, scoped customer; never load it here.
  if (
    !customer ||
    String(customer._id) !== String(userId) ||
    typeof customer.name !== 'string' ||
    typeof customer.email !== 'string' ||
    typeof customer.telephone !== 'string'
  ) {
    throw new Error('Booking serialization requires its current customer.');
  }
  let cancelledAt = null;
  let cancelledBy = null;
  if (booking.cancelledAt) {
    cancelledAt = new Date(booking.cancelledAt).toISOString();
  }
  if (booking.cancelledBy) {
    cancelledBy = String(booking.cancelledBy);
  }
  return {
    id: String(booking._id),
    userId: String(userId),
    providerId: String(booking.providerId),
    vehicleId: String(booking.vehicleId),
    customer: {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      telephone: customer.telephone,
    },
    vehicleSnapshot: serializeVehicleSnapshot(booking.vehicleSnapshot),
    startDate: booking.startDate,
    dueDate: booking.dueDate,
    rentalDays: booking.rentalDays,
    ratePerDaySatang: booking.ratePerDaySatang,
    totalPriceSatang: booking.totalPriceSatang,
    currency: booking.currency,
    status: bookingStatus(booking, today),
    cancelledAt,
    cancelledBy,
    cancellationReason: booking.cancellationReason,
    createdAt: new Date(booking.createdAt).toISOString(),
    updatedAt: new Date(booking.updatedAt).toISOString(),
  };
}

module.exports = { serializeBooking };
