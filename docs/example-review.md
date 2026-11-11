# Course example review

Reviewed 2026-11-11. The user supplied `example/` (lowercase on disk), a hospital/appointment API, as evidence of the practices taught during the term. It is reference code, not a mandate to copy every behavior. No files under `example/` were modified.

## Scope and verification

Read all 12 JavaScript files, `package.json`, and relevant lockfile metadata. Read only environment variable names from `config/config.env`, not their values. No example credentials were used or reproduced. Environment names: PORT, NODE_ENV, MONGO_URI, JWT_SECRET, JWT_EXPIRE, JWT_COOKIE_EXPIRE.

Ran `node --check` on all 12 JavaScript files: all passed syntax checks. No dependencies were installed, server started, database contacted, or live endpoint tests performed. `example/node_modules` is absent. Static findings below are not claims of reproduced runtime failures.

The manifest declares CommonJS JavaScript, Express, Mongoose, bcryptjs, jsonwebtoken, dotenv, nodemon, security middleware, and Swagger packages. Lockfile v3 resolves Express 5.3.0, Mongoose 9.11.4, jsonwebtoken 9.0.3 and bcryptjs 3.0.3. Locked Mongoose requires Node >=20.19.0 and swagger-jsdoc requires Node >=20.0.0. The inspected shell has Node 24.19.0; actual Dobby dependencies still require installation/runtime checks.

## Practices demonstrated and how to reuse them

| Observed practice | Local evidence | Dobby direction |
| --- | --- | --- |
| Feature routes, controllers and models | `routes/`, `controllers/`, `models/` | Keep this familiar structure; add service functions for multi-model rules |
| REST resources under `/api/v1` | `server.js`, resource routers | Keep prefix and resource-oriented routes |
| CommonJS and async/await | All modules | Keep JavaScript/CommonJS and async/await |
| Database connection isolated in config | `config/db.js` | Keep config module; await database readiness before listening |
| Mongoose schemas, refs and validation | `models/` | Add provider applications, vehicles, bookings and authentication sessions |
| Populate and reverse virtual relationships | Hospital/Appointment models and controllers | Use explicit safe field selections; never expose private bookings through public discovery |
| Password hashing and model methods | `models/User.js` | Keep bcryptjs and hidden password hashes; hash only if password changed |
| JWT login and Bearer protection | User model, auth controller/middleware | Keep JWT Bearer with a session record so logout actually revokes access |
| Role middleware and per-owner mutation checks | `middleware/auth.js`, appointment controller | Extend to user/company/admin, ownership on every read/write, and live provider-state checks |
| Nested routers with mergeParams | Hospital and appointment routers | Available where useful; choose canonical booking mutation routes to avoid duplicate authorization paths |
| Filtering/sorting/pagination | `controllers/hospitals.js` | Keep capability, but use explicit allowlists, bounded limits and filtered totals |
| Security headers and request limiting | `server.js` | Keep Helmet and rate limiting with tested options; explicit request validation is primary |
| OpenAPI annotations and Swagger UI | Hospital routes, `server.js` | Keep familiar Swagger tooling; expand to all actual routes with correct schemas |
| Success/data response envelope | Controllers | Standardize success/data/message/code and pagination across modules |
| Environment configuration and nodemon | config module and manifest | Keep dotenv and dev script; provide secret-free `.env.example` and real start/test scripts |

## Issues to correct rather than copy

| Finding | Evidence / consequence | Required change for Dobby |
| --- | --- | --- |
| Public signup accepts `role` | `controllers/auth.js:26`; role enum includes admin | Server fixes role by signup endpoint; seed admin separately |
| Individual appointment read has no owner check | `controllers/appointments.js:47`; authenticated router allows all ordinary users | Scope individual reads as well as lists to customer/company/admin permissions |
| Public hospital listing populates appointments | `controllers/hospitals.js:16` | Public provider/vehicle discovery must not populate private bookings or document URLs |
| Owner/admin check misspells `role` as `rold` | Appointment update/delete checks | Use shared, tested authorization; valid admins must retain assigned access |
| Mutation accepts all of `req.body` | Appointment update and several resource controllers | Allow only agreed input fields; never accept owner, provider, role, status or price total from clients |
| Three-appointment cap is count-then-create | `addAppointment` reads all existing records then creates | Use correct effective-state predicate and concurrency serialization, including vehicle interval checks |
| Logout clears cookie only | Auth logout versus Bearer-only protect | Persist/revoke JWT sessions; reused token must fail after logout |
| Password save hook hashes on every save | User pre-save hook has no `isModified` guard | Avoid hashing an already-hashed password when unrelated account fields change |
| Pre-save signature retains callback parameter with Mongoose 9 | `async function(next)` in User model | Use supported async hook without next parameter; see official migration guide below. The current body does not call next; this is a cleanup/compatibility concern, not a reproduced failure |
| Protect does not reject a missing database user after valid JWT | Middleware assigns findById result then next | Reject absent user/session and check current role/provider state |
| Hospital deletion hard-deletes associated records | Hospital deleteMany and deleteOne | Dobby deactivates vehicles/cancels bookings and preserves history |
| Rate limiter option misspelled | `windowsMs` in `server.js:59` | Use documented `windowMs`; current typo does not configure the intended ten-minute window |
| Unrestricted query/projection input and unfiltered pagination total | Hospital controller | Build validated filters/projections; count the same filtered predicate; use a real indexed default sort |
| Incomplete/mismatched API docs | Only hospital routes annotated; UUID label for Mongo IDs; response array differs from envelope; title says Library API | Document actual Dobby schemas, bearer auth, roles, envelopes and error cases |
| No real automated tests | `scripts.test` intentionally exits 1; no test/collection files supplied | Add rule tests, isolated-database integration checks and Runner/Newman collection |
| App startup and listening coupled | `server.js` | Export app separately for tests; await DB connection in server entry point |

Generic sanitizer packages do not replace input validation. Some middleware assumptions need Express 5 compatibility verification; `req.query` is a getter in Express 5. Do not assert that every installed sanitizer fails without exercising it. Do not copy the existing stack of overlapping sanitizers automatically.

## Official references checked

- [Express 5 migration](https://expressjs.com/en/guide/migrating-5/): async error forwarding and query-property changes.
- [Mongoose 9 migration](https://mongoosejs.com/docs/migrating_to_9.html): pre-hook API changes.
- [express-rate-limit configuration](https://express-rate-limit.mintlify.app/reference/configuration): correct `windowMs` option.
- [node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken): signing/verifying tokens and relevant options.
- [Node.js test runner](https://nodejs.org/api/test.html): built-in automated test support.

These references guide implementation; the local code and user decisions remain the evidence for course practice and project scope. No package vulnerability audit or end-to-end runtime certification has been performed.
