const AppError = require('../utils/AppError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const User = require('../models/User');
const { serializeUser } = require('../serializers/auth');

const SESSION_LENGTH_MS = 24 * 60 * 60 * 1000;

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new AppError(500, 'Authentication is not configured.');
  }
}

function createToken(user, now) {
  const sid = randomUUID();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date(now.getTime() + SESSION_LENGTH_MS);
  const token = jwt.sign(
    { sid, iat: issuedAt, exp: Math.floor(expiresAt.getTime() / 1000) },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: String(user._id),
    },
  );
  return { sid, token, expiresAt };
}

async function saveSession(user, now, session) {
  const issued = createToken(user, now);
  const options = session ? { session } : undefined;
  await AuthSession.create(
    [{ sid: issued.sid, userId: user._id, expiresAt: issued.expiresAt }],
    options,
  );
  return { user: serializeUser(user), token: issued.token, expiresAt: issued.expiresAt };
}

function mapDuplicate(error) {
  if (error?.code !== 11000) {
    return error;
  }
  const key = Object.keys(error.keyPattern || {})[0];
  let message = 'This account conflicts with an existing record.';
  if (key === 'email') {
    message = 'An account with this email already exists.';
  } else if (key === 'businessRegistrationNumber') {
    message = 'A provider with this registration number already exists.';
  }
  return new AppError(409, message);
}

async function registerCustomer(req, res, next) {
  try {
    requireJwtSecret();
    const input = req.validated.body;
    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const [user] = await User.create(
          [
            {
              name: input.name,
              telephone: input.telephone,
              email: input.email,
              passwordHash: input.password,
              role: 'user',
              providerId: null,
            },
          ],
          { session },
        );
        result = await saveSession(user, now, session);
      });
    } catch (error) {
      throw mapDuplicate(error);
    } finally {
      await session.endSession();
    }
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function registerProvider(req, res, next) {
  try {
    requireJwtSecret();
    const input = req.validated.body;
    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const providerId = new mongoose.Types.ObjectId();
        const applicationId = new mongoose.Types.ObjectId();
        const [user] = await User.create(
          [
            {
              name: input.name,
              telephone: input.telephone,
              email: input.email,
              passwordHash: input.password,
              role: 'provider',
              providerId,
            },
          ],
          { session },
        );
        await Provider.create(
          [
            {
              _id: providerId,
              representativeId: user._id,
              businessRegistrationNumber: input.businessRegistrationNumber,
              status: 'pending',
              latestApplicationId: applicationId,
              applicationSequence: 1,
            },
          ],
          { session },
        );
        await ProviderApplication.create(
          [
            {
              _id: applicationId,
              providerId,
              version: 1,
              businessRegistrationNumber: input.businessRegistrationNumber,
              profile: input.profile,
              status: 'pending',
              submittedAt: now,
            },
          ],
          { session },
        );
        result = await saveSession(user, now, session);
      });
    } catch (error) {
      throw mapDuplicate(error);
    } finally {
      await session.endSession();
    }
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    requireJwtSecret();
    const input = req.validated.body;
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'Email or password is incorrect.');
    }
    if (user.role === 'provider') {
      const provider = await Provider.findById(user.providerId).select('status');
      if (!provider || provider.status === 'suspended') {
        throw new AppError(403, 'This provider account is suspended.');
      }
    }
    const result = await saveSession(user, new Date());
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const now = new Date();
    const updated = await AuthSession.findOneAndUpdate(
      {
        sid: req.actor.sessionId,
        userId: req.actor.userId,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { revokedAt: now } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new AppError(401, 'Authentication is required.');
    }
    const result = { message: 'Logged out successfully.' };
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.actor.userId);
    if (!user) {
      throw new AppError(401, 'Authentication is required.');
    }
    const result = serializeUser(user);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMe, login, logout, registerProvider, registerCustomer };
