require('dotenv').config({ quiet: true });

function getConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const port = Number(environment.PORT || 5003);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const mongoUri = environment.MONGO_URI;
  if (typeof mongoUri !== 'string' || mongoUri.trim() === '') {
    throw new Error('MONGO_URI is required.');
  }

  return { nodeEnv, port, mongoUri };
}

module.exports = { getConfig };
