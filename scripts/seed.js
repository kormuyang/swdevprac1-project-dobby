require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');
const User = require('../models/User');
const { validateLogin } = require('../validators/auth');

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
  if (databaseName !== 'dobby') {
    throw new Error('MONGO_URI must explicitly name dobby.');
  }
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD locally.');
  }
  if (
    Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) < 8 ||
    Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) > 72
  ) {
    throw new Error('Admin password must contain 8 to 72 UTF-8 bytes.');
  }
  try {
    validateLogin({ email: adminEmail, password: process.env.SEED_ADMIN_PASSWORD });
  } catch {
    throw new Error('SEED_ADMIN_EMAIL must be a valid login email.');
  }
  return uri;
}

async function seed() {
  const uri = validateConfiguration();
  await mongoose.connect(uri);
  try {
    await User.createIndexes();
    const email = process.env.SEED_ADMIN_EMAIL.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role !== 'admin') {
        throw new Error('SEED_ADMIN_EMAIL already belongs to a non-admin account.');
      }
      return false;
    }
    await User.create({
      name: 'Dobby Seed Admin',
      telephone: '+66000000000',
      email,
      passwordHash: process.env.SEED_ADMIN_PASSWORD,
      role: 'admin',
    });
    return true;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed()
    .then((created) => {
      console.log(created ? 'Admin account created.' : 'Admin account already exists; unchanged.');
    })
    .catch((error) => {
      const safeConfigurationError = /^(MONGO_URI|Set SEED_|Admin password|SEED_ADMIN_EMAIL)/.test(
        error.message,
      );
      console.error(
        safeConfigurationError
          ? error.message
          : 'Admin creation failed. Check the local database and admin configuration.',
      );
      process.exitCode = 1;
    });
}

module.exports = { getDatabaseName, validateConfiguration, seed };
