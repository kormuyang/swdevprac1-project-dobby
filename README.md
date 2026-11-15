# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). This branch integrates authentication, company review/suspension, vehicle discovery/management, bookings, setup and the combined demo. See the implementation plan and PRs for review and merge status.

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

## Seed and reset

`npm run seed` requires MONGO_URI to name dobby_dev_a, dobby_dev_b, dobby_test_a or dobby_test_b, plus locally supplied SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_FIXTURE_PASSWORD. It creates synthetic accounts (two approved companies, pending/rejected/suspended companies and two customers), two vehicles and one historical booking. Repeated seed replaces identified fixtures only; other dependent vehicle/booking data makes it refuse replacement.

`npm run reset:test` targets only dobby_test_a through TEST_MONGO_URI. `npm run reset:test -- --owner=b` targets only dobby_test_b through TEST_MONGO_URI_B. Both delete the selected test database and require ALLOW_TEST_DB_RESET=true. No reset runs during ordinary startup.

## Demo and response times

After seeding and starting the local API, supply the seeded admin credentials locally and run `npm run test:demo`. It generates the other credentials in memory and runs the [combined collection](postman/dobby.postman_collection.json) against loopback hosts only. See the [demo guide](docs/demo-guide.md), [use cases](docs/use-cases.md) and [API map](docs/diagrams/api.md).

`npm run test:performance` starts its own local API against TEST_PERF_MONGO_URI, which must name an empty dobby_test_performance database. Supply PERF_DB_REGION for Atlas. It creates two providers, ten vehicles and thirty historical bookings, records ten sequential measurements per selected endpoint, then removes its own fixtures. The sanitized report is written to reports/response-times.json (ignored by Git); pass another output path after `--` if needed. Local results do not establish Atlas T41 acceptance. D-07/D-10 and Saint’s integrated-main review remain open. Existing Newman development dependency findings are deferred under D-45; run only the trusted project collection against the local API.
