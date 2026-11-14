const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema({
  sid: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

authSessionSchema.index({ sid: 1 }, { unique: true, name: 'uq_session_sid' });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, revokedAt: 1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
