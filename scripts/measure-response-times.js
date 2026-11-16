const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const AuthSession = require('../models/AuthSession');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { serializeVehicleSnapshot } = require('../serializers/vehicles');
const { todayBangkok } = require('../utils/dates');

function validatePerformanceConfiguration() {
  let parsed;
  try {
    parsed = new URL(process.env.MONGO_URI);
  } catch {
    throw new Error('Set MONGO_URI to shared dobby.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || parsed.pathname !== '/dobby') {
    throw new Error('MONGO_URI must name shared dobby.');
  }
  if (parsed.hostname.endsWith('.mongodb.net') && !process.env.PERF_DB_REGION?.trim()) {
    throw new Error('Set PERF_DB_REGION before an Atlas performance run.');
  }
  return {
    uri: process.env.MONGO_URI,
    databaseKind: parsed.hostname.endsWith('.mongodb.net') ? 'Atlas' : 'local-or-other',
  };
}

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function measureResponseTimes(outputPath = 'reports/response-times.json') {
  const config = validatePerformanceConfiguration();
  const secret = randomUUID();
  const ids = { users: [], providers: [], applications: [], vehicles: [], bookings: [] };
  let server;
  const results = [];
  function newId(group) {
    const id = new mongoose.Types.ObjectId();
    ids[group].push(id);
    return id;
  }
  try {
    await mongoose.connect(config.uri);
    for (const Model of [User, Provider, ProviderApplication, AuthSession, Vehicle, Booking]) {
      if ((await Model.countDocuments({})) !== 0) {
        throw new Error('Performance database must be empty; use an empty shared database.');
      }
      await Model.createIndexes();
    }
    async function account(role, providerId = null) {
      const id = newId('users');
      const email = `${randomUUID()}@example.test`;
      const password = randomUUID();
      await User.create({
        _id: id,
        name: 'Synthetic Performance Account',
        telephone: '123456789',
        email,
        passwordHash: password,
        role,
        providerId,
      });
      const sid = randomUUID();
      await AuthSession.create({ sid, userId: id, expiresAt: new Date(Date.now() + 300_000) });
      return {
        id,
        email,
        password,
        token: jwt.sign({ sid }, secret, {
          subject: String(id),
          expiresIn: '5m',
          algorithm: 'HS256',
        }),
      };
    }
    const customer = await account('user');
    const outsider = await account('user');
    const admin = await account('admin');
    const providerAccounts = [];
    for (let index = 0; index < 2; index++) {
      const providerId = newId('providers');
      const applicationId = newId('applications');
      const providerAccount = await account('provider', providerId);
      const registration = randomUUID();
      await ProviderApplication.create({
        _id: applicationId,
        providerId,
        version: 1,
        businessRegistrationNumber: registration,
        status: 'approved',
        profile: {
          legalName: 'Synthetic Performance Rental',
          registeredAddress: 'Test Road',
          telephone: '123456789',
          contactEmail: 'performance@example.test',
          documentUrl: 'https://example.test/synthetic-document',
        },
      });
      await Provider.create({
        _id: providerId,
        representativeId: providerAccount.id,
        businessRegistrationNumber: registration,
        status: 'approved',
        latestApplicationId: applicationId,
        approvedApplicationId: applicationId,
      });
      providerAccounts.push(providerAccount);
    }
    const vehicles = [];
    for (let index = 0; index < 10; index++) {
      vehicles.push(
        await Vehicle.create({
          _id: newId('vehicles'),
          providerId: ids.providers[index % 2],
          vin: `P-${randomUUID()}`,
          model: 'Performance City',
          transmissionType: 'automatic',
          fuelType: 'hybrid',
          seatingCapacity: 5,
          pickupBranch: { name: 'Test Branch', address: 'Test Road' },
          ratePerDaySatang: 100_000,
          availableFrom: '2000-01-01',
        }),
      );
    }
    for (let index = 0; index < 30; index++) {
      const vehicle = vehicles[index % 10];
      const date = `2000-01-${String(1 + Math.floor(index / 10) * 2).padStart(2, '0')}`;
      await Booking.create({
        _id: newId('bookings'),
        userId: customer.id,
        providerId: vehicle.providerId,
        vehicleId: vehicle._id,
        startDate: date,
        dueDate: date,
        rentalDays: 1,
        ratePerDaySatang: 100_000,
        totalPriceSatang: 100_000,
        vehicleSnapshot: serializeVehicleSnapshot(vehicle),
      });
    }
    const port = await freePort();
    const started = performance.now();
    server = spawn(process.execPath, ['server.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'ignore',
      env: {
        ...process.env,
        DOTENV_CONFIG_PATH: '/dev/null',
        MONGO_URI: config.uri,
        JWT_SECRET: secret,
        PORT: String(port),
      },
    });
    server.once('error', () => {});
    const base = `http://127.0.0.1:${port}/api/v1`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) {
        throw new Error('The performance API process exited before startup.');
      }
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(500) });
        if (response.status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!ready) {
      throw new Error('The performance API process did not become ready.');
    }
    const coldStartupMs = performance.now() - started;
    async function measure(label, method, route, expectedStatus, actor, body, record = true) {
      const headers = {};
      if (actor) {
        headers.authorization = `Bearer ${actor.token}`;
      }
      if (body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      const start = performance.now();
      const response = await fetch(base + route, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const payload = await response.json();
      const elapsedMs = Math.round((performance.now() - start) * 100) / 100;
      if (record) {
        results.push({
          endpoint: label,
          method,
          status: response.status,
          expectedStatus,
          elapsedMs,
          passed: response.status === expectedStatus && elapsedMs <= 3000,
        });
      }
      if (response.status !== expectedStatus) {
        throw new Error(`Unexpected status for ${label}; no response content printed.`);
      }
      return payload;
    }
    const cases = [
      ['public providers', '/providers', 200],
      ['public vehicles', '/vehicles', 200],
      ['vehicle detail', `/vehicles/${vehicles[0].id}`, 200],
      ['customer booking history', '/bookings', 200, customer],
      ['admin booking history', '/bookings', 200, admin],
      ['provider booking history', '/provider/bookings', 200, providerAccounts[0]],
      ['provider vehicles', '/provider/vehicles', 200, providerAccounts[0]],
      ['hidden booking', `/bookings/${ids.bookings[0]}`, 404, outsider],
      ['wrong-role provider read', '/provider/vehicles', 403, customer],
      ['invalid vehicle filter', '/vehicles?minSeats=invalid', 400],
    ];
    for (const [label, route, status, actor] of cases) {
      await measure(label, 'GET', route, status, actor, undefined, false);
      for (let index = 0; index < 10; index++) {
        await measure(label, 'GET', route, status, actor);
      }
    }
    for (let index = 0; index < 10; index++) {
      await measure('login', 'POST', '/auth/login', 200, null, {
        email: customer.email,
        password: customer.password,
      });
      await measure('wrong password', 'POST', '/auth/login', 401, null, {
        email: customer.email,
        password: 'synthetic-wrong-password',
      });
    }
    const today = todayBangkok(new Date());
    function dateAfter(days) {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    }
    for (let index = 0; index < 10; index++) {
      const created = await measure('create booking', 'POST', '/bookings', 201, customer, {
        vehicleId: vehicles[0].id,
        startDate: dateAfter(10),
        dueDate: dateAfter(10),
      });
      ids.bookings.push(created.data.id);
      await measure('edit booking dates', 'PATCH', `/bookings/${created.data.id}`, 200, customer, {
        startDate: dateAfter(11),
        dueDate: dateAfter(11),
      });
      await measure('cancel booking', 'DELETE', `/bookings/${created.data.id}`, 200, customer);
      await Booking.deleteOne({ _id: created.data.id });
    }
    const build = await mongoose.connection.db.admin().command({ buildInfo: 1 });
    const report = {
      measuredAt: new Date().toISOString(),
      runtime: process.version,
      machine: { platform: os.platform(), architecture: os.arch(), cpu: os.cpus()[0]?.model },
      database: {
        kind: config.databaseKind,
        version: build.version,
        region: process.env.PERF_DB_REGION || 'not supplied',
        label: 'shared dobby database',
      },
      dataset: { providers: 2, vehicles: 10, historicalBookings: 30 },
      repetitions: 10,
      coldStartupMs: Math.round(coldStartupMs * 100) / 100,
      notes:
        'Read routes warmed once. Auth writes stay within throttling limits. Booking writes are sequential and their synthetic records are removed between repetitions.',
      results,
      passed: results.every((result) => result.passed),
    };
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(
      `Response-time check: ${results.length} requests, max ${Math.max(...results.map((result) => result.elapsedMs))} ms; ${report.passed ? 'passed' : 'failed'}.`,
    );
    if (config.databaseKind !== 'Atlas') {
      console.log('Local verification only; Atlas T41 remains pending.');
    }
    return report;
  } catch (error) {
    if (results.length > 0) {
      fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            incomplete: true,
            passed: false,
            runtime: process.version,
            dataset: { providers: 2, vehicles: 10, historicalBookings: 30 },
            results,
          },
          null,
          2,
        ) + '\n',
      );
    }
    throw error;
  } finally {
    if (server && server.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
        server.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        server.kill('SIGTERM');
      });
    }
    if (mongoose.connection.readyState === 1) {
      await Booking.deleteMany({ _id: { $in: ids.bookings } });
      await Vehicle.deleteMany({ _id: { $in: ids.vehicles } });
      await ProviderApplication.deleteMany({ _id: { $in: ids.applications } });
      await Provider.deleteMany({ _id: { $in: ids.providers } });
      await AuthSession.deleteMany({ userId: { $in: ids.users } });
      await User.deleteMany({ _id: { $in: ids.users } });
    }
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });
  measureResponseTimes(process.argv[2])
    .then((report) => {
      if (!report.passed) {
        process.exitCode = 1;
      }
    })
    .catch(() => {
      console.error(
        'Response-time check failed. Verify the shared database and local API setup; no connection details printed.',
      );
      process.exitCode = 1;
    });
}
module.exports = { validatePerformanceConfiguration, measureResponseTimes };
