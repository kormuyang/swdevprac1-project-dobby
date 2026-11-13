# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). A00 provides the foundation; A01 implements auth, A02 company review, A03 suspension/reactivation and A04 seed/reset. Vehicle/booking APIs and the Newman demo remain planned.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): who works on each task and what to start next.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, service functions and endpoints.
- [Decisions](docs/decisions.md): agreed choices and remaining questions.
- [Test checklist](docs/acceptance-checklist.md): cases to check before calling a feature done.

Follow [AGENTS.md](AGENTS.md) when coding. Use Node 24. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET` before starting the server. Authentication uses 24-hour HS256 Bearer tokens with persisted, revocable sessions.

`server.js` defines the middleware and listener, and invokes `connectDB()` without awaiting it. `config/db.js` enables Mongoose `strictQuery`, connects using `MONGO_URI`, and logs the connected host.

A Node 24 smoke check passed for startup, cookie parsing, health, CORS/Helmet headers, Swagger, and the JSON 404 response. Environment loading and database access were mocked. Startup and health also passed under Node 24 against a temporary local MongoDB 8.0.38 replica set. Connection rejection was checked to exit with status 1 and a generic message. Atlas remains unverified.

Install dependencies and run the available development/start commands:

```text
npm ci
npm run dev
npm start
```

## Authentication

The base path is `/api/v1/auth`:

- `POST /register`: customer signup.
- `POST /register-company`: company account, provider, first application and session in one transaction.
- `POST /login`: create a session.
- `GET /me`: read the authenticated account.
- `POST /logout`: revoke the current session, including for suspended companies.

Use the [OpenAPI contract](docs/contracts/openapi.json) for request fields. Signup requires a transaction-capable MongoDB replica set such as Atlas; account creation and its initial session commit together. Bootstrap the four auth models' indexes before checking uniqueness; normal server startup does not sync or drop indexes. No real credentials or tokens belong in committed examples.

See [A01 diagrams and course alignment](docs/diagrams/a01-auth.md). A01 started before G0 with the user's authorization; G0 and partner integration remain pending. Database behavior requires real integration verification.

## Local database setup

Copy `.env.example` to `.env`. Set `MONGO_URI` to a dedicated `dobby_dev_a` or `dobby_test_a` database before seeding. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_FIXTURE_PASSWORD` locally; both passwords must contain 8–72 UTF-8 bytes. Seed credentials are never committed or printed. `npm run seed` creates a local admin, two customer accounts and approved, pending, rejected and suspended company fixtures. It creates indexes first and replaces only the fixture accounts with the reserved `@dobby.example.test` emails, including their sessions and applications. Company fixtures use synthetic HTTPS document links. Vehicle and booking fixtures wait for B's models.

`npm run reset:test` drops the database named by `TEST_MONGO_URI` only when it is exactly `dobby_test_a` and `ALLOW_TEST_DB_RESET=true`. This deletes all data in that test database. Never point it at development or shared data. Seed and reset reject a missing or differently named database before connecting.

The committed tests check these guards without connecting to MongoDB. Seeding and reset against a replica set remain unverified until the commands are run with a local dedicated database and credentials.

## A02 company review

Company representatives can read their approved profile, list application history, read an owned version and submit an immutable profile revision. Admins can list/read providers and applications and approve or reject one pending version. See [A02 flow and verification limits](docs/diagrams/a02-company-review.md). The local suite includes provider validation and serializer checks. `npm run test:integration` also runs the provider review test against an explicitly configured `dobby_test_a` replica set; it has not been run unless reported separately.


## A01 verification

Run `npm test` under Node 24 for the local auth checks. Seven tests pass, covering input validation, safe output, bcrypt save behavior and JWT/session middleware with database methods mocked. A separate native-HTTP smoke check passed safe parser errors, authentication-first denial and the shared 20-request auth limiter without a database connection.

Run `npm run test:integration` with `TEST_MONGO_URI` supplied locally. The test accepts only `dobby_test_a`, creates auth indexes, uses synthetic fixtures and removes only its own records. It checks company signup persistence, duplicate-registration rollback and independent session logout. It passed against a temporary local MongoDB 8.0.38 replica set under Node 24. This is not Atlas verification or full T01–T06, T11, T36 or T38 coverage. T06 application reads and vehicle/booking restrictions also depend on A02 and B.


## A03 lifecycle

Admin suspend/reactivate routes are mounted under `/api/v1/admin/providers`. The controller owns the transaction. `services/bookingCancellation.js` implements the agreed cancellation interface against the actual booking/vehicle collections; B must use the same guards in its writers. See [A03 diagrams and integration boundary](docs/diagrams/a03-provider-lifecycle.md).

The A03 Node 24 integration test passed against temporary local MongoDB 8.0.38. It checks cancellation scoping, rollback after cancellation writes, suspended session denial/logout, reactivation without restoration, and a competing guarded transaction. B HTTP integration, Atlas and partner review remain pending.
