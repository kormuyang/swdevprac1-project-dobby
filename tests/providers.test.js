const assert = require('node:assert/strict');
const test = require('node:test');
const { serializeApplication, serializePage, serializeProvider } = require('../serializers/providers');
const { validateApplication, validateObjectId, validatePage, validateReview } = require('../validators/providers');

const profile = {
  legalName: ' Rental Co ',
  registeredAddress: ' 1 Main Road ',
  telephone: ' +66123456789 ',
  contactEmail: ' CONTACT@EXAMPLE.TEST ',
  documentUrl: 'https://example.test/doc.pdf',
};

test('profile submissions allow only normalized profile fields and HTTPS document URLs', () => {
  assert.deepEqual(validateApplication(profile), {
    legalName: 'Rental Co', registeredAddress: '1 Main Road', telephone: '+66123456789',
    contactEmail: 'contact@example.test', documentUrl: 'https://example.test/doc.pdf',
  });
  assert.throws(() => validateApplication({ ...profile, businessRegistrationNumber: 'forged' }), { status: 400 });
  assert.throws(() => validateApplication({ ...profile, documentUrl: 'http://example.test/doc.pdf' }), { status: 400 });
  assert.throws(() => validateApplication({ ...profile, documentUrl: 'https://%' }), { status: 400 });
});

test('review input accepts approve or reject with a required trimmed reason', () => {
  assert.deepEqual(validateReview({ decision: 'approve' }), { decision: 'approve' });
  assert.deepEqual(validateReview({ decision: 'reject', reason: '  Missing evidence  ' }), { decision: 'reject', reason: 'Missing evidence' });
  assert.throws(() => validateReview({ decision: 'reject' }), { status: 400 });
  assert.throws(() => validateReview({ decision: 'approve', reason: 'unexpected' }), { status: 400 });
});

test('pagination and optional status filters follow the contract allowlist', () => {
  assert.deepEqual(validatePage({ page: '2', limit: '50' }, { statuses: ['pending'] }), { page: 2, limit: 50 });
  assert.deepEqual(validatePage({ status: 'pending' }, { statuses: ['pending'] }), { page: 1, limit: 25, status: 'pending' });
  assert.throws(() => validatePage({ limit: '101' }), { status: 400 });
  assert.throws(() => validatePage({ page: ['1', '2'] }), { status: 400 });
  assert.throws(() => validatePage({ limit: { value: '2' } }), { status: 400 });
  assert.throws(() => validatePage({ owner: 'all' }), { status: 400 });
  assert.throws(() => validatePage({ status: 'suspended' }, { statuses: ['pending'] }), { status: 400 });
  assert.equal(validateObjectId('507f1f77bcf86cd799439011', 'id'), '507f1f77bcf86cd799439011');
  assert.throws(() => validateObjectId('not-an-id', 'id'), { status: 400 });
});

test('serializers expose contract fields only and preserve provider status', () => {
  const app = serializeApplication({
    _id: '507f1f77bcf86cd799439011', providerId: '507f1f77bcf86cd799439012', version: 2,
    businessRegistrationNumber: 'REG-1', profile, status: 'rejected', rejectionReason: 'No proof',
    reviewedBy: '507f1f77bcf86cd799439013', submittedAt: new Date(0), reviewedAt: new Date(1), internal: 'omit',
  });
  assert.equal(app.internal, undefined);
  assert.equal(app.profile.contactEmail, profile.contactEmail);
  assert.deepEqual(serializeProvider({
    _id: '507f1f77bcf86cd799439012', representativeId: '507f1f77bcf86cd799439013',
    businessRegistrationNumber: 'REG-1', status: 'suspended', approvedApplicationId: app.id,
    latestApplicationId: app.id, revision: 99, createdAt: new Date(0), updatedAt: new Date(1),
  }, { profile }).status, 'suspended');
  assert.deepEqual(serializePage([app], 1, 1, 25).pagination, { page: 1, limit: 25, total: 1, pages: 1 });
});
