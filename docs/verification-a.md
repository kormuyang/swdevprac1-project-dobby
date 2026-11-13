# A verification receipt

Verified on November 13, 2026 using Node 24.22.3 and temporary local MongoDB Community 8.0.38, single-node replica set, on macOS arm64. No Atlas credentials or real environment files were used.

## Results

- `npm test`: 15 local tests passed. These cover auth validation/serialization, actual Mongoose password save behavior with collection methods mocked, JWT/session middleware, provider input/serialization and seed/reset guards.
- `npm run test:integration`: three suites passed on dedicated `dobby_test_a`. They cover persisted signup, duplicate rollback, independent session logout, application version races, scoped private reads, approval during suspension, atomic suspension/cancellation, rollback after cancellation writes, and provider guard contention observed from a real MongoDB transient transaction error.
- Seed ran twice on `dobby_dev_a`. Seven users, four providers and four applications, references, bcrypt hashes and indexes were checked. Reseeding with dependent booking data was refused without deleting accounts.
- An explicit-flag reset emptied only local `dobby_test_a`, preserving the separate development fixtures. Missing-name/flag checks fail before connecting.
- Newman: 21 requests and 33 assertions passed against the integrated local A server. The latest run's maximum response time was 117 ms. The baseline seed contains seven accounts and four providers; the journey adds a customer, a company and three application versions. No B vehicle/booking HTTP APIs were present.
- A00 startup/health passed on the local replica set. A rejected connection exited 1 with a generic message.

## Limits

These results do not establish Atlas behavior, actual B endpoint races, full T01–T42 acceptance or a full A+B T40 demo. The competing booking transaction in the lifecycle test exercises the agreed guard protocol using native synthetic collections; B must integrate and test its HTTP writers with that protocol.

The Newman response times are a smoke measurement, not the T41 protocol: ten repetitions per endpoint with ten vehicles and thirty historical bookings remain pending B implementation. Partner review, instructor-specific UML Profile for API notation (D-07), and course disclosure/delivery expectations (D-10) also remain pending.

