const AppError = require('../utils/AppError');
const { objectIdField } = require('../validators/fields');
const jwt = require('jsonwebtoken');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const User = require('../models/User');

function unauthorized() {
  return new AppError(401, 'Authentication is required.');
}

function protect(options = {}) {
  return async function authenticate(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      return next(unauthorized());
    }
    if (!process.env.JWT_SECRET) {
      return next(new AppError(500, 'The request could not be completed.'));
    }
    let claims;
    let userId;
    try {
      claims = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
      userId = objectIdField(claims?.sub, 'userId');
    } catch {
      return next(unauthorized());
    }
    if (
      !claims ||
      typeof claims.sid !== 'string' ||
      claims.sid.length === 0 ||
      !Number.isInteger(claims.exp)
    ) {
      return next(unauthorized());
    }

    try {
      const user = await User.findById(userId).select('role providerId');
      if (!user) {
        return next(unauthorized());
      }
      const authSession = await AuthSession.findOne({
        sid: { $eq: String(claims.sid) },
        userId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).select('sid');
      if (!authSession) {
        return next(unauthorized());
      }
      req.actor = {
        userId: String(user._id),
        role: user.role,
        providerId: user.providerId ? String(user.providerId) : null,
        sessionId: authSession.sid,
      };

      if (user.role === 'provider' && !options.allowSuspended) {
        const provider = await Provider.findById(user.providerId).select('status');
        if (!provider || provider.status === 'suspended') {
          return next(new AppError(403, 'This provider account is suspended.'));
        }
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function authorize(...roles) {
  return function authorizeActor(req, res, next) {
    if (!req.actor) {
      return next(unauthorized());
    }
    if (!roles.includes(req.actor.role)) {
      return next(new AppError(403, 'This account is not allowed to perform this action.'));
    }
    return next();
  };
}

module.exports = { authorize, protect };
