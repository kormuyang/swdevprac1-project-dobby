# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). A00 provides the Express foundation. A01 adds customer/company signup, login, current-session logout and account reads. A02 adds company profile/application history and admin review. Vehicle and booking APIs, seed/reset and the Newman demo remain planned.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): who works on each task and what to start next.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, service functions and endpoints.
- [Decisions](docs/decisions.md): agreed choices and remaining questions.
- [Test checklist](docs/acceptance-checklist.md): cases to check before calling a feature done.

Follow [AGENTS.md](AGENTS.md) when coding. Use Node 24. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET` before starting the server. Authentication uses 24-hour HS256 Bearer tokens with persisted, revocable sessions.

`server.js` defines the middleware and listener, and invokes `connectDB()` without awaiting it. `config/db.js` enables Mongoose `strictQuery`, connects using `MONGO_URI`, and logs the connected host.

A Node 24 smoke check passed for startup, cookie parsing, health, CORS/Helmet headers, Swagger, and the JSON 404 response. Environment loading and database access were mocked. A live database connection has not been verified.

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

See [A01 diagrams and course alignment](docs/diagrams/a01-auth.md). A01 started before G0 with the user's authorization; G0 and partner integration remain pending. Database behavior requires real integration verification. Seed/reset and Newman demo scripts belong to later tasks.

## A02 company review

Company representatives can read their approved profile, list application history, read an owned version and submit an immutable profile revision. Admins can list/read providers and applications and approve or reject one pending version. See [A02 flow and verification limits](docs/diagrams/a02-company-review.md). The local suite includes provider validation and serializer checks. `npm run test:integration` also runs the provider review test against an explicitly configured `dobby_test_a` replica set; it has not been run unless reported separately.


## A01 verification

Run `npm test` under Node 24 for the local auth checks. Seven tests pass, covering input validation, safe output, bcrypt save behavior and JWT/session middleware with database methods mocked. A separate native-HTTP smoke check passed safe parser errors, authentication-first denial and the shared 20-request auth limiter without a database connection.

Run `npm run test:integration` with `TEST_MONGO_URI` supplied locally. The test accepts only `dobby_test_a`, creates auth indexes, uses synthetic fixtures and removes only its own records. It checks company signup persistence, duplicate-registration rollback and independent session logout. It passed against a temporary local MongoDB 8.0.38 replica set under Node 24. This is not Atlas verification or full T01–T06, T11, T36 or T38 coverage. T06 application reads and vehicle/booking restrictions also depend on A02 and B.
