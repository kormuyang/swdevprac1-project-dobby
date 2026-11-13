const jwt = require('jsonwebtoken');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const User = require('../models/User');

function unauthorized(res) {
  return res.status(401).json({ success: false, message: 'Authentication is required.' });
}

function protect(options = {}) {
  return async function authenticate(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      return unauthorized(res);
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'The request could not be completed.' });
    }
    let claims;
    try {
      claims = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return unauthorized(res);
    }
    if (!claims || typeof claims.sub !== 'string' || !/^[0-9a-f]{24}$/i.test(claims.sub)
      || typeof claims.sid !== 'string' || claims.sid.length === 0
      || !Number.isInteger(claims.exp)) {
      return unauthorized(res);
    }

    try {
      const user = await User.findById(claims.sub).select('role providerId');
      if (!user) {
        return unauthorized(res);
      }
      const authSession = await AuthSession.findOne({
        sid: claims.sid,
        userId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).select('sid');
      if (!authSession) {
        return unauthorized(res);
      }
      req.actor = {
        userId: String(user._id),
        role: user.role,
        providerId: user.providerId ? String(user.providerId) : null,
        sessionId: authSession.sid,
      };

      if (user.role === 'company' && !options.allowSuspended) {
        const provider = await Provider.findById(user.providerId).select('status');
        if (!provider || provider.status === 'suspended') {
          return res.status(403).json({ success: false, message: 'This company account is suspended.' });
        }
      }
      return next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'The request could not be completed.' });
    }
  };
}

function authorize(...roles) {
  return function authorizeActor(req, res, next) {
    if (!req.actor) {
      return unauthorized(res);
    }
    if (!roles.includes(req.actor.role)) {
      return res.status(403).json({ success: false, message: 'This account is not allowed to perform this action.' });
    }
    return next();
  };
}

module.exports = { authorize, protect };
