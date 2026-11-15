const mongoose = require('mongoose');
const { inclusiveDays, validateDateOnly } = require('../utils/dates');
const { calculateTotal } = require('../utils/money');
const { vehicleSnapshotSchema } = require('./vehicleDetails');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, immutable: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, immutable: true },
  startDate: { type: String, required: true, validate: validateDateOnly },
  dueDate: { type: String, required: true, validate: validateDateOnly },
  state: { type: String, required: true, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  vehicleSnapshot: { type: vehicleSnapshotSchema, required: true, immutable: true },
  ratePerDaySatang: { type: Number, required: true, min: 1, max: 1_000_000_000, validate: Number.isSafeInteger, immutable: true },
  rentalDays: { type: Number, required: true, min: 1, max: 30, validate: Number.isInteger },
  totalPriceSatang: { type: Number, required: true, min: 1, max: 30_000_000_000, validate: Number.isSafeInteger },
  currency: { type: String, required: true, enum: ['THB'], default: 'THB', immutable: true },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancellationReason: {
    type: String,
    enum: ['customer_cancelled', 'admin_cancelled', 'provider_suspended', null],
    default: null,
  },
}, { timestamps: true });

bookingSchema.pre('validate', function checkDatesAndPrice() {
  if (!this.startDate || !this.dueDate || this.ratePerDaySatang === undefined) {
    return;
  }
  try {
    const days = inclusiveDays(this.startDate, this.dueDate);
    const total = calculateTotal(this.ratePerDaySatang, days);
    if (this.rentalDays !== days) {
      this.invalidate('rentalDays', 'Rental days must match the inclusive booking dates.');
    }
    if (this.totalPriceSatang !== total) {
      this.invalidate('totalPriceSatang', 'Total must equal the booked daily rate multiplied by rental days.');
    }
  } catch (error) {
    this.invalidate('dueDate', error.message);
  }
});

bookingSchema.index({ userId: 1, state: 1, dueDate: 1 });
bookingSchema.index({ vehicleId: 1, state: 1, startDate: 1, dueDate: 1 });
bookingSchema.index({ providerId: 1, state: 1, dueDate: 1 });
bookingSchema.index({ userId: 1, createdAt: -1, _id: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
