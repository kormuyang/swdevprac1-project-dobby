const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const test = require('node:test');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { serializeUser } = require('../serializers/auth');
const {
  validateCompanyRegistration,
  validateLogin,
  validateRegistration,
} = require('../validators/auth');

const registration = {
  name: 'Ada Driver',
  telephone: '+66123456789',
  email: 'ADA@example.com',
  password: 'correct horse',
};

async function runProtect(token, { user, session, provider, failUserLookup = false, allowSuspended = false } = {}) {
  const originals = [User.findById, AuthSession.findOne, Provider.findById];
  User.findById = () => {
    if (failUserLookup) {
      throw new Error('database unavailable');
    }
    return { select: async () => user };
  };
  AuthSession.findOne = () => ({ select: async () => session });
  Provider.findById = () => ({ select: async () => provider });
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const req = { get: () => `Bearer ${token}` };
  let nextCalled = false;
  try {
    await protect({ allowSuspended })(req, res, () => { nextCalled = true; });
    return { ...res, nextCalled, actor: req.actor };
  } finally {
    [User.findById, AuthSession.findOne, Provider.findById] = originals;
  }
}

function tokenWith(claims, algorithm = 'HS256') {
  return jwt.sign(claims, process.env.JWT_SECRET, { algorithm, subject: '507f1f77bcf86cd799439011' });
}

test('customer signup accepts only contract fields and normalizes email', () => {
  assert.deepEqual(validateRegistration(registration), { ...registration, email: 'ada@example.com' });
  assert.throws(() => validateRegistration({ ...registration, role: 'admin' }), { status: 400 });
  assert.throws(() => validateRegistration({ ...registration, providerId: '507f1f77bcf86cd799439011' }), { status: 400 });
});

test('password validation measures UTF-8 bytes and login allowlists fields', () => {
  assert.throws(() => validateRegistration({ ...registration, password: 'é'.repeat(37) }), { status: 400 });
  assert.equal(validateLogin({ email: ' A@EXAMPLE.COM ', password: 'correct horse' }).email, 'a@example.com');
  assert.throws(() => validateLogin({ email: 'a@example.com', password: 'correct horse', role: 'admin' }), { status: 400 });
});

test('company registration validates a nested allowlist and HTTPS document link', () => {
  const input = {
    ...registration,
    businessRegistrationNumber: ' REG-123 ',
    profile: {
      legalName: 'Example Rentals Co.',
      registeredAddress: '1 Main Road',
      telephone: '+66123456789',
      contactEmail: 'contact@example.com',
      documentUrl: 'https://example.com/registration.pdf',
    },
  };
  assert.equal(validateCompanyRegistration(input).businessRegistrationNumber, 'REG-123');
  assert.throws(() => validateCompanyRegistration({
    ...input,
    profile: { ...input.profile, documentUrl: 'http://example.com/registration.pdf' },
  }), { status: 400 });
  assert.throws(() => validateCompanyRegistration({
    ...input,
    profile: { ...input.profile, documentId: 'unexpected' },
  }), { status: 400 });
});

test('safe user output excludes credential and internal fields', () => {
  const dto = serializeUser({
    _id: '507f1f77bcf86cd799439011',
    name: 'Ada Driver',
    telephone: '+66123456789',
    email: 'ada@example.com',
    role: 'user',
    providerId: null,
    passwordHash: 'secret-hash',
    bookingRevision: 8,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  assert.deepEqual(Object.keys(dto), ['id', 'name', 'telephone', 'email', 'role', 'providerId', 'createdAt']);
  assert.equal(dto.providerId, null);
  assert.equal('passwordHash' in dto, false);
});

test('saving a user hashes the password once and preserves it on an unrelated save', async (t) => {
  let inserted;
  let update;
  t.mock.method(User.collection, 'insertOne', async (document) => {
    inserted = { ...document };
    return { acknowledged: true, insertedId: document._id };
  });
  t.mock.method(User.collection, 'updateOne', async (filter, changes) => {
    update = changes;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const user = new User({
    name: 'Synthetic User',
    telephone: '123456789',
    email: 'synthetic@example.test',
    passwordHash: 'correct horse',
  });
  await user.save();
  assert.equal(await bcrypt.compare('correct horse', inserted.passwordHash), true);
  assert.equal(bcrypt.getRounds(inserted.passwordHash), 10);
  const hash = user.passwordHash;
  user.name = 'Changed Name';
  await user.save();
  assert.equal(user.passwordHash, hash);
  assert.equal(Object.hasOwn(update.$set, 'passwordHash'), false);
});

test('protect rejects wrong algorithm, expired/missing expiry and malformed subjects', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-secret';
  const sid = 'c79e51a0-5297-4e7d-8079-cd0d6f124809';
  const validClaims = { sid, exp: Math.floor(Date.now() / 1000) + 60 };
  try {
    const wrongAlgorithm = await runProtect(tokenWith(validClaims, 'HS512'));
    const expired = await runProtect(tokenWith({ sid, exp: 1 }));
    const missingExpiry = await runProtect(tokenWith({ sid }));
    const malformedSubject = await runProtect(jwt.sign({ ...validClaims }, process.env.JWT_SECRET, { algorithm: 'HS256', subject: 'invalid' }));
    for (const result of [wrongAlgorithm, expired, missingExpiry, malformedSubject]) {
      assert.equal(result.statusCode, 401);
      assert.equal(result.body.success, false);
    }
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});

test('protect loads current actor and rejects missing sessions, suspension and database errors', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-secret';
  const sid = 'c79e51a0-5297-4e7d-8079-cd0d6f124809';
  const token = tokenWith({ sid, exp: Math.floor(Date.now() / 1000) + 60 });
  const user = { _id: '507f1f77bcf86cd799439011', role: 'company', providerId: '607f1f77bcf86cd799439012' };
  const session = { sid };
  try {
    const active = await runProtect(token, { user, session, provider: { status: 'pending' } });
    assert.equal(active.nextCalled, true);
    assert.deepEqual(active.actor, {
      userId: '507f1f77bcf86cd799439011',
      role: 'company',
      providerId: '607f1f77bcf86cd799439012',
      sessionId: sid,
    });

    const missingSession = await runProtect(token, { user, session: null });
    assert.equal(missingSession.statusCode, 401);

    const suspended = await runProtect(token, { user, session, provider: { status: 'suspended' } });
    assert.equal(suspended.statusCode, 403);
    const logoutAllowed = await runProtect(token, { user, session, allowSuspended: true });
    assert.equal(logoutAllowed.nextCalled, true);

    const databaseFailure = await runProtect(token, { failUserLookup: true });
    assert.equal(databaseFailure.statusCode, 500);
    assert.deepEqual(databaseFailure.body, { success: false, message: 'The request could not be completed.' });
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});

