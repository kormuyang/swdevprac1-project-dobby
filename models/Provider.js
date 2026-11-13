const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  representativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  businessRegistrationNumber: { type: String, required: true, trim: true, minlength: 1, maxlength: 50, immutable: true },
  status: { type: String, required: true, enum: ['pending', 'rejected', 'approved', 'suspended'], default: 'pending' },
  approvedApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', default: null },
  latestApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', required: true },
  applicationSequence: { type: Number, required: true, default: 1, min: 1 },
  revision: { type: Number, required: true, default: 0, min: 0 },
  suspensionReason: { type: String, default: null, maxlength: 1000 },
  suspendedAt: { type: Date, default: null },
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reactivationNote: { type: String, default: null, maxlength: 1000 },
  reactivatedAt: { type: Date, default: null },
  reactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

providerSchema.index(
  { businessRegistrationNumber: 1 },
  { unique: true, name: 'uq_provider_registration' },
);
providerSchema.index({ representativeId: 1 }, { unique: true, name: 'uq_provider_representative' });
providerSchema.index({ status: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Provider', providerSchema);
