const { randomBytes, randomUUID } = require('node:crypto');
const newman = require('newman');

function localBaseUrl() {
  const value = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5003/api/v1';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DEMO_BASE_URL must be a local application URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.search || url.hash) {
    throw new Error('DEMO_BASE_URL must use a local host without credentials or query parameters.');
  }
  return url.toString().replace(/\/$/, '');
}

function runDemo() {
  if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for the local seeded administrator.');
  }

  const suffix = randomUUID();
  const values = [
    ['baseUrl', localBaseUrl(), 'default'],
    ['adminEmail', process.env.SEED_ADMIN_EMAIL, 'secret'],
    ['adminPassword', process.env.SEED_ADMIN_PASSWORD, 'secret'],
    ['customerEmail', `demo-customer-${suffix}@example.test`, 'default'],
    ['customerPassword', randomBytes(24).toString('base64url'), 'secret'],
    ['companyEmail', `demo-${suffix}@example.test`, 'default'],
    ['companyPassword', randomBytes(24).toString('base64url'), 'secret'],
    ['registrationNumber', `DEMO-${suffix}`, 'default'],
    ['contactEmail', `contact-${suffix}@example.test`, 'default'],
    ['legalNameV1', `Demo Rental ${suffix.slice(0, 8)}`, 'default'],
    ['legalNameV2', `Demo Rental Revision ${suffix.slice(0, 8)}`, 'default'],
    ['legalNameV3', `Demo Rental Approved ${suffix.slice(0, 8)}`, 'default'],
  ].map(([key, value, type]) => ({ key, value, type, enabled: true }));

  newman.run({
    collection: require('../postman/a-auth-provider.postman_collection.json'),
    environment: {
      id: randomUUID(),
      name: 'Generated local demo environment',
      values,
      _postman_variable_scope: 'environment',
    },
    reporters: [],
    silent: true,
    bail: true,
    ignoreRedirects: true,
    timeoutRequest: 10000,
    timeoutScript: 10000,
  }, (error, summary) => {
    const failedAssertions = summary?.run?.stats?.assertions?.failed || 0;
    const failedRequests = summary?.run?.stats?.requests?.failed || 0;
    const failedItems = summary?.run?.failures?.length || 0;
    if (error || failedAssertions > 0 || failedRequests > 0 || failedItems > 0) {
      console.error('A auth/provider Newman demo failed. Review the collection in Postman for request details.');
      process.exitCode = 1;
      return;
    }
    const count = summary.run.stats.requests.total;
    const assertions = summary.run.stats.assertions.total;
    const maxResponseTime = Math.max(...summary.run.executions.map((execution) => execution.response.responseTime));
    console.log(`A auth/provider Newman demo passed: ${count} requests, ${assertions} assertions, max ${maxResponseTime} ms.`);
  });
}

try {
  runDemo();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
