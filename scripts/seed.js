require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const User = require('../models/User');
const { validateLogin } = require('../validators/auth');

const fixtures = [
  { key: 'user-1', role: 'user', name: 'Dobby Customer One', email: 'customer-1@dobby.example.test' },
  { key: 'user-2', role: 'user', name: 'Dobby Customer Two', email: 'customer-2@dobby.example.test' },
  { key: 'provider-approved', role: 'company', status: 'approved', registration: 'DOBBY-SEED-APPROVED-001', name: 'Dobby Approved Rental' },
  { key: 'provider-pending', role: 'company', status: 'pending', registration: 'DOBBY-SEED-PENDING-001', name: 'Dobby Pending Rental' },
  { key: 'provider-rejected', role: 'company', status: 'rejected', registration: 'DOBBY-SEED-REJECTED-001', name: 'Dobby Rejected Rental' },
  { key: 'provider-suspended', role: 'company', status: 'suspended', registration: 'DOBBY-SEED-SUSPENDED-001', name: 'Dobby Suspended Rental' },
];

function getDatabaseName(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGO_URI must be a valid MongoDB connection string.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('MONGO_URI must be a valid MongoDB connection string.');
  }
  return parsed.pathname.replace(/^\//, '');
}

function validateConfiguration() {
  const uri = process.env.MONGO_URI;
  const databaseName = uri && getDatabaseName(uri);
  if (!['dobby_dev_a', 'dobby_test_a'].includes(databaseName)) {
    throw new Error('MONGO_URI must explicitly name dobby_dev_a or dobby_test_a.');
  }
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (fixtures.some((fixture) => (fixture.email || companyEmail(fixture.key)) === adminEmail)) {
    throw new Error('SEED_ADMIN_EMAIL must be different from the reserved fixture emails.');
  }
  if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_FIXTURE_PASSWORD) {
    throw new Error('Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_FIXTURE_PASSWORD locally.');
  }
  if (Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) < 8 || Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) > 72
      || Buffer.byteLength(process.env.SEED_FIXTURE_PASSWORD) < 8 || Buffer.byteLength(process.env.SEED_FIXTURE_PASSWORD) > 72) {
    throw new Error('Seed passwords must contain 8 to 72 UTF-8 bytes.');
  }
  try {
    validateLogin({ email: adminEmail, password: process.env.SEED_ADMIN_PASSWORD });
  } catch {
    throw new Error('SEED_ADMIN_EMAIL must be a valid login email.');
  }
  return uri;
}

async function removeExistingFixtures(session) {
  const emails = fixtures.map((fixture) => fixture.email || companyEmail(fixture.key));
  const adminEmail = process.env.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail }).select('_id role name providerId').session(session);
  if (existingAdmin && (existingAdmin.role !== 'admin' || existingAdmin.name !== 'Dobby Seed Admin')) {
    throw new Error('SEED_ADMIN_EMAIL already belongs to a non-seed account.');
  }
  const users = await User.find({ email: { $in: emails } }).select('_id providerId name email role').session(session);
  for (const user of users) {
    const fixture = fixtures.find((entry) => (entry.email || companyEmail(entry.key)) === user.email);
    if (user.name !== fixture.name || user.role !== fixture.role) {
      throw new Error('Reserved fixture email belongs to a non-seed account.');
    }
  }
  if (existingAdmin) {
    users.push(existingAdmin);
  }
  const providerIds = users.map((user) => user.providerId).filter(Boolean);
  const userIds = users.map((user) => user._id);

  const vehicle = await mongoose.connection.collection('vehicles').findOne(
    { providerId: { $in: providerIds } }, { session },
  );
  const booking = await mongoose.connection.collection('bookings').findOne(
    { $or: [{ userId: { $in: userIds } }, { providerId: { $in: providerIds } }] }, { session },
  );
  if (vehicle || booking) {
    throw new Error('Seed fixtures have vehicle or booking data. Reset the dedicated test database first.');
  }

  await AuthSession.deleteMany({ userId: { $in: userIds } }, { session });
  await ProviderApplication.deleteMany({ providerId: { $in: providerIds } }, { session });
  await Provider.deleteMany({ _id: { $in: providerIds } }, { session });
  await User.deleteMany({ _id: { $in: userIds } }, { session });
}

function companyEmail(key) {
  return `${key}@dobby.example.test`;
}

function applicationProfile(fixture) {
  return {
    legalName: `${fixture.name} Ltd`,
    registeredAddress: '1 Synthetic Test Road, Bangkok',
    telephone: '+66000000000',
    contactEmail: `contact-${fixture.key}@dobby.example.test`,
    documentUrl: `https://example.test/${fixture.key}-document.pdf`,
  };
}

async function createFixture(fixture, session) {
  const isCompany = fixture.role === 'company';
  const user = new User({
    name: fixture.name,
    telephone: '+66000000000',
    email: fixture.email || companyEmail(fixture.key),
    passwordHash: process.env.SEED_FIXTURE_PASSWORD,
    role: fixture.role,
  });

  if (!isCompany) {
    await user.save({ session });
    return;
  }

  const providerId = new mongoose.Types.ObjectId();
  const applicationId = new mongoose.Types.ObjectId();
  user.providerId = providerId;
  await user.save({ session });

  const application = new ProviderApplication({
    _id: applicationId,
    providerId,
    version: 1,
    businessRegistrationNumber: fixture.registration,
    profile: applicationProfile(fixture),
    status: fixture.status === 'suspended' ? 'approved' : fixture.status,
    rejectionReason: fixture.status === 'rejected' ? 'Synthetic rejection fixture.' : null,
    submittedAt: new Date(),
    reviewedAt: ['approved', 'rejected', 'suspended'].includes(fixture.status) ? new Date() : null,
  });
  await application.save({ session });

  const provider = new Provider({
    _id: providerId,
    representativeId: user._id,
    businessRegistrationNumber: fixture.registration,
    status: fixture.status,
    approvedApplicationId: ['approved', 'suspended'].includes(fixture.status) ? applicationId : null,
    latestApplicationId: applicationId,
    applicationSequence: 1,
    suspensionReason: fixture.status === 'suspended' ? 'Synthetic suspension fixture.' : null,
    suspendedAt: fixture.status === 'suspended' ? new Date() : null,
  });
  await provider.save({ session });
}

async function seed() {
  const uri = validateConfiguration();
  await mongoose.connect(uri);
  try {
    await Promise.all([User, Provider, ProviderApplication, AuthSession].map((Model) => Model.createIndexes()));
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await removeExistingFixtures(session);
        const admin = new User({
          name: 'Dobby Seed Admin',
          telephone: '+66000000000',
          email: process.env.SEED_ADMIN_EMAIL.trim().toLowerCase(),
          passwordHash: process.env.SEED_ADMIN_PASSWORD,
          role: 'admin',
        });
        await admin.save({ session });
        for (const fixture of fixtures) {
          await createFixture(fixture, session);
        }
      });
    } finally {
      await session.endSession();
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed().then(() => {
    console.log(`Seeded A fixtures in ${getDatabaseName(process.env.MONGO_URI)}.`);
  }).catch((error) => {
    const safeConfigurationError = /^(MONGO_URI|Set SEED_|Seed passwords|SEED_ADMIN_EMAIL)/.test(error.message);
    console.error(safeConfigurationError ? error.message : 'Seed failed. Check the local database and fixture configuration.');
    process.exitCode = 1;
  });
}

module.exports = { getDatabaseName, validateConfiguration, seed };
