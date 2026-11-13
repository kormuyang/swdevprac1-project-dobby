const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  telephone: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, immutable: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['user', 'company', 'admin'], default: 'user' },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  bookingRevision: { type: Number, required: true, default: 0, min: 0 },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, name: 'uq_user_email' });
userSchema.index(
  { providerId: 1 },
  { unique: true, name: 'uq_user_provider', partialFilterExpression: { providerId: { $type: 'objectId' } } },
);

userSchema.pre('save', async function hashChangedPassword() {
  if (!this.isModified('passwordHash')) {
    return;
  }

  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

module.exports = mongoose.model('User', userSchema);
