require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });

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

function validateConfiguration(owner = 'a') {
  if (!['a', 'b'].includes(owner)) {
    throw new Error('Reset owner must be a or b.');
  }
  const variable = owner === 'b' ? 'TEST_MONGO_URI_B' : 'TEST_MONGO_URI';
  const database = `dobby_test_${owner}`;
  const uri = process.env[variable];
  if (!uri || getDatabaseName(uri) !== database) {
    throw new Error(`${variable} must explicitly name ${database}.`);
  }
  if (process.env.ALLOW_TEST_DB_RESET !== 'true') {
    throw new Error(`Set ALLOW_TEST_DB_RESET=true to reset ${database}.`);
  }
  return uri;
}

async function resetTestDatabase(owner = 'a') {
  const uri = validateConfiguration(owner);
  await mongoose.connect(uri);
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  let owner = 'invalid';
  if (process.argv[2] === undefined || process.argv[2] === '--owner=a') {
    owner = 'a';
  }
  if (process.argv[2] === '--owner=b') {
    owner = 'b';
  }
  resetTestDatabase(owner)
    .then(() => {
      console.log(`Reset dobby_test_${owner}.`);
    })
    .catch((error) => {
      const safeConfigurationError = /^(TEST_MONGO_URI|Set ALLOW_TEST_DB_RESET)/.test(
        error.message,
      );
      console.error(
        safeConfigurationError
          ? error.message
          : 'Reset failed. Check the local test database connection.',
      );
      process.exitCode = 1;
    });
}

module.exports = { getDatabaseName, validateConfiguration, resetTestDatabase };
