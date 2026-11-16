const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { serializeVehicleSnapshot } = require('../serializers/vehicles');

const vehicleVins = ['DOBBY-SEED-VEHICLE-001', 'DOBBY-SEED-VEHICLE-002'];
const bookingId = new mongoose.Types.ObjectId('600000000000000000000001');

async function createRentalFixtures(session) {
  const owners = await User.find({
    email: {
      $in: ['provider-approved@dobby.example.test', 'provider-approved-two@dobby.example.test'],
    },
  })
    .sort({ email: 1 })
    .session(session);
  const customer = await User.findOne({ email: 'customer-1@dobby.example.test' }).session(session);
  let firstVehicle;
  for (let index = 0; index < owners.length; index++) {
    const vehicle = new Vehicle({
      providerId: owners[index].providerId,
      vin: vehicleVins[index],
      model: 'Seed City',
      transmissionType: 'automatic',
      fuelType: 'hybrid',
      seatingCapacity: 5,
      pickupBranch: { name: 'Seed Branch', address: 'Synthetic Road' },
      ratePerDaySatang: 100_000,
      availableFrom: '2000-01-01',
    });
    await vehicle.save({ session });
    if (index === 0) {
      firstVehicle = vehicle;
    }
  }
  const booking = new Booking({
    _id: bookingId,
    userId: customer._id,
    providerId: firstVehicle.providerId,
    vehicleId: firstVehicle._id,
    vehicleSnapshot: serializeVehicleSnapshot(firstVehicle),
    ratePerDaySatang: 100_000,
    startDate: '2000-01-01',
    dueDate: '2000-01-03',
    rentalDays: 3,
    totalPriceSatang: 300_000,
  });
  await booking.save({ session });
}

module.exports = { vehicleVins, bookingId, createRentalFixtures };
