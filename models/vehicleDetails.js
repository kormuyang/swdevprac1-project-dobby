const mongoose = require('mongoose');

function createBranchSchema(immutable) {
  return new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120, immutable },
    address: { type: String, required: true, trim: true, minlength: 1, maxlength: 500, immutable },
  }, { _id: false });
}

const vehicleDetails = {
  vin: { type: String, required: true, trim: true, uppercase: true, minlength: 6, maxlength: 40, immutable: true },
  brand: {
    type: String, trim: true, minlength: 1, maxlength: 80, immutable: true,
    validate(value) {
      return value !== null;
    },
  },
  model: { type: String, required: true, trim: true, minlength: 1, maxlength: 120, immutable: true },
  modelYear: { type: Number, min: 1900, max: 2100, validate: Number.isInteger, immutable: true },
  transmissionType: { type: String, required: true, enum: ['automatic', 'manual'], immutable: true },
  fuelType: { type: String, required: true, enum: ['petrol', 'diesel', 'hybrid', 'electric', 'other'], immutable: true },
  seatingCapacity: { type: Number, required: true, min: 1, max: 20, validate: Number.isInteger, immutable: true },
  pickupBranch: { type: createBranchSchema(false), required: true },
};

const vehicleSnapshotSchema = new mongoose.Schema({
  ...vehicleDetails,
  // Freeze the nested branch too: immutable on the parent alone does not protect child edits.
  pickupBranch: { type: createBranchSchema(true), required: true, immutable: true },
}, { _id: false });

module.exports = { vehicleDetails, vehicleSnapshotSchema };
