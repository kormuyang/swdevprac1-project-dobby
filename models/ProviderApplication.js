const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  legalName: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  registeredAddress: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
  telephone: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
  contactEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  documentUrl: { type: String, required: true, trim: true, maxlength: 2048 },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, immutable: true },
  version: { type: Number, required: true, min: 1, immutable: true },
  businessRegistrationNumber: { type: String, required: true, trim: true, minlength: 1, maxlength: 50, immutable: true },
  profile: { type: profileSchema, required: true, immutable: true },
  status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: null, maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  submittedAt: { type: Date, required: true, default: Date.now, immutable: true },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

applicationSchema.index({ providerId: 1, version: 1 }, { unique: true, name: 'uq_application_version' });
applicationSchema.index(
  { providerId: 1 },
  { unique: true, name: 'uq_application_pending', partialFilterExpression: { status: 'pending' } },
);
applicationSchema.index({ status: 1, submittedAt: 1, _id: 1 });

module.exports = mongoose.model('ProviderApplication', applicationSchema);
