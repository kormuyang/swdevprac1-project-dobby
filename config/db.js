const mongoose = require('mongoose');

async function connectToDatabase(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('A MongoDB connection URI is required.');
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectToDatabase, disconnectFromDatabase };
