require('dotenv').config();

const mongoose = require('mongoose');

function getDatabaseName(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('TEST_MONGO_URI must be a valid MongoDB connection string.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('TEST_MONGO_URI must be a valid MongoDB connection string.');
  }
  return parsed.pathname.replace(/^\//, '');
}

function validateConfiguration() {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri || getDatabaseName(uri) !== 'dobby_test_a') {
    throw new Error('TEST_MONGO_URI must explicitly name dobby_test_a.');
  }
  if (process.env.ALLOW_TEST_DB_RESET !== 'true') {
    throw new Error('Set ALLOW_TEST_DB_RESET=true to reset dobby_test_a.');
  }
  return uri;
}

async function resetTestDatabase() {
  const uri = validateConfiguration();
  await mongoose.connect(uri);
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  resetTestDatabase().then(() => {
    console.log('Reset dobby_test_a.');
  }).catch((error) => {
    const safeConfigurationError = /^(TEST_MONGO_URI|Set ALLOW_TEST_DB_RESET)/.test(error.message);
    console.error(safeConfigurationError ? error.message : 'Reset failed. Check the local test database connection.');
    process.exitCode = 1;
  });
}

module.exports = { getDatabaseName, validateConfiguration, resetTestDatabase };
