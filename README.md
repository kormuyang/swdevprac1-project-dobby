# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). A00 provides the Express foundation, A01 adds authentication, A02 adds company applications/admin review, B00 adds date/money helpers, and B01 adds Vehicle/Booking models, validators and serializers. A03 suspension/reactivation is integrated as a development dependency. B02 provides public discovery and company vehicle APIs. B03 provides customer/admin booking operations. B04 adds approved-company booking views and suspension integration. A04 adds guarded seed/reset; rental fixtures and the combined demo follow in B05.

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

## Company applications and review

Company representatives can read their profile and application history and submit revisions. Admins review applications and access the review queue. A revision does not replace the approved profile until approval; approval never clears suspension. See [OpenAPI](docs/contracts/openapi.json) for endpoints and fields and [A02 diagrams](docs/diagrams/a02-company-review.md) for the flow.

## Tests

Run all local tests without a database:

```text
npm test
```

Run all database integration tests with both test connections supplied locally:

```text
npm run test:integration
```

Auth/company-review tests use `TEST_MONGO_URI` and accept only `dobby_test_a`. Rental model tests use `TEST_MONGO_URI_B` and accept only `dobby_test_b`. All need a replica set, create indexes first and clean up only their synthetic fixtures. Keep them separate from development data. Test results and unverified cases belong in the PR description; the checklist tracks acceptance coverage.

## Company lifecycle

Admin suspend/reactivate routes are mounted under `/api/v1/admin/providers`. The controller owns the transaction. `services/bookingCancellation.js` uses the caller's session and the shared provider/user/vehicle guard order. See [A03 diagrams](docs/diagrams/a03-provider-lifecycle.md). Actual B HTTP integration and Atlas acceptance require separate verification.

## Seed and reset

`npm run seed` accepts only `dobby_dev_a` or `dobby_test_a` through MONGO_URI. Supply SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_FIXTURE_PASSWORD locally; passwords require 8–72 UTF-8 bytes. It creates an admin, two customers and four company-state fixtures. It builds indexes and replaces identified fixtures only, refusing replacement when vehicle or booking data depends on them.

`npm run reset:test` requires TEST_MONGO_URI to name `dobby_test_a` and ALLOW_TEST_DB_RESET=true. It deletes that test database. Normal startup runs neither seed nor reset. Rental fixtures and explicit B reset follow in B05.
