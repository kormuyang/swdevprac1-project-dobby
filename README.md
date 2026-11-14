# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). A00 provides the Express foundation, A01 adds authentication, and B00 adds date/money helpers. Company review, vehicles, bookings, seed/reset and the Newman demo remain planned.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): ownership, tasks and integration gates.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, interfaces and endpoints.
- [Decisions](docs/decisions.md): agreed choices and open questions.
- [Test checklist](docs/acceptance-checklist.md): acceptance cases.

Follow [AGENTS.md](AGENTS.md) when coding.

## Setup

Use Node 24. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET` locally. Signup needs a transaction-capable MongoDB replica set such as Atlas. Bootstrap the four auth models' indexes before checking uniqueness; normal startup does not sync or drop indexes.

```text
npm ci
npm run dev
npm start
```

The default port is 5003. Health is at `/api/v1/health`; Swagger UI is at `/api-docs`. Health reports process status, not database readiness: `server.js` starts the database connection without awaiting it. A failed connection exits the process.

## Authentication

The base path is `/api/v1/auth`:

- `POST /register`: customer signup.
- `POST /register-company`: company account, provider, first application and session in one transaction.
- `POST /login`: create a session.
- `GET /me`: read the authenticated account.
- `POST /logout`: revoke the current session, including for suspended companies.

Authentication uses 24-hour HS256 Bearer tokens with persisted, revocable sessions. Use [OpenAPI](docs/contracts/openapi.json) for request fields and [A01 diagrams](docs/diagrams/a01-auth.md) for flows and course alignment. Never commit credentials or tokens.

## Tests

Run all local auth and date/money tests without a database:

```text
npm test
```

Run database integration tests with `TEST_MONGO_URI` supplied locally:

```text
npm run test:integration
```

Integration tests accept only the dedicated `dobby_test_a` replica-set database, create indexes first and clean up their synthetic fixtures. Use a separate database from development and B's tests. Test results and unverified cases belong in the PR description; the checklist tracks acceptance coverage.
