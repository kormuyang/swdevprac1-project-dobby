const mongoose = require('mongoose');
const { validateDateOnly } = require('../utils/dates');
const { vehicleDetails } = require('./vehicleDetails');

const vehicleSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      immutable: true,
    },
    ...vehicleDetails,
    ratePerDaySatang: {
      type: Number,
      required: true,
      min: 1,
      max: 1_000_000_000,
      validate: Number.isSafeInteger,
    },
    availableFrom: { type: String, required: true, validate: validateDateOnly },
    availableUntil: {
      type: String,
      default: null,
      validate(value) {
        return value === null || Boolean(validateDateOnly(value));
      },
    },
    isActive: { type: Boolean, required: true, default: true },
    revision: { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger },
  },
  { timestamps: true },
);

vehicleSchema.pre('validate', function checkOfferingPeriod() {
  if (this.availableUntil !== null && this.availableFrom > this.availableUntil) {
    this.invalidate('availableUntil', 'The offering end must be on or after its start.');
  }
});

vehicleSchema.index({ vin: 1 }, { unique: true, name: 'uq_vehicle_vin' });
vehicleSchema.index({ providerId: 1, isActive: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
