const app = require('./app');
const { getConfig } = require('./config/env');
const { connectToDatabase, disconnectFromDatabase } = require('./config/db');

async function startServer() {
  const config = getConfig();
  await connectToDatabase(config.mongoUri);

  const server = app.listen(config.port, () => {
    console.log(`Dobby API listening on port ${config.port}`);
  });

  server.on('close', () => {
    void disconnectFromDatabase();
  });

  return server;
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('Dobby API failed to start. Check configuration and database availability.');
    process.exitCode = 1;
  });
}

module.exports = { startServer };
