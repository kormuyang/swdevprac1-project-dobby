require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');

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
  if (!uri || getDatabaseName(uri) !== 'dobby') {
    throw new Error('MONGO_URI must explicitly name dobby.');
  }
  if (process.env.ALLOW_TEST_DB_RESET !== 'true') {
    throw new Error('Set ALLOW_TEST_DB_RESET=true to reset the shared dobby database.');
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
  if (process.argv.length > 2) {
    console.error('reset:test does not accept arguments. It resets the shared dobby database.');
    process.exit(1);
  }
  resetTestDatabase()
    .then(() => {
      console.log('Reset the shared dobby database.');
    })
    .catch((error) => {
      const safeConfigurationError = /^(MONGO_URI|Set ALLOW_TEST_DB_RESET)/.test(error.message);
      console.error(
        safeConfigurationError
          ? error.message
          : 'Reset failed. Check the shared database connection.',
      );
      process.exitCode = 1;
    });
}

module.exports = { getDatabaseName, validateConfiguration, resetTestDatabase };
