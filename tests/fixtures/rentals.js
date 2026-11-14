const mongoose = require('mongoose');

function vehicleInput(overrides = {}) {
  return {
    providerId: new mongoose.Types.ObjectId(),
    vin: 'SYNTHETIC-VIN-001',
    brand: 'Example Motors',
    model: 'City',
    modelYear: 2030,
    transmissionType: 'automatic',
    fuelType: 'hybrid',
    seatingCapacity: 5,
    pickupBranch: { name: 'Branch A', address: '1 Test Road' },
    ratePerDaySatang: 100_000,
    availableFrom: '2030-01-01',
    availableUntil: null,
    ...overrides,
  };
}

function bookingInput(overrides = {}) {
  return {
    userId: new mongoose.Types.ObjectId(),
    providerId: new mongoose.Types.ObjectId(),
    vehicleId: new mongoose.Types.ObjectId(),
    startDate: '2030-01-10',
    dueDate: '2030-01-12',
    vehicleSnapshot: {
      vin: 'SYNTHETIC-VIN-001',
      brand: 'Example Motors',
      model: 'City',
      modelYear: 2030,
      transmissionType: 'automatic',
      fuelType: 'hybrid',
      seatingCapacity: 5,
      pickupBranch: { name: 'Branch A', address: '1 Test Road' },
    },
    ratePerDaySatang: 100_000,
    rentalDays: 3,
    totalPriceSatang: 300_000,
    ...overrides,
  };
}

module.exports = { vehicleInput, bookingInput };
