# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). This branch integrates authentication, provider review/suspension, vehicle discovery/management, bookings, setup and the combined demo. See the implementation plan and PRs for review and merge status.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): ownership, tasks and integration gates.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, interfaces and endpoints.
- [Decisions](docs/decisions.md): agreed choices and open questions.
- [Test checklist](docs/acceptance-checklist.md): acceptance cases.

Follow [AGENTS.md](AGENTS.md) when coding.

## Setup

Use Node 24. Copy `.env.example` to `.env` and set `MONGO_URI` (with database name `dobby`) and `JWT_SECRET` locally. The app, tests and tools share this database. Signup needs a transaction-capable MongoDB replica set such as Atlas. Bootstrap the four auth models' indexes before checking uniqueness; normal startup does not sync or drop indexes.

```text
npm ci
npm run dev
npm start
```

The default port is 5003. Health is at `/api/v1/health`; Swagger UI is at `/api-docs`. Health reports process status, not database readiness: `server.js` starts the database connection without awaiting it. A failed connection exits the process.

## Authentication

The base path is `/api/v1/auth`:

- `POST /register`: customer signup.
- `POST /register-provider`: provider account, provider, first application and session in one transaction.
- `POST /login`: create a session.
- `GET /me`: read the authenticated account.
- `POST /logout`: revoke the current session, including for suspended providers.

Authentication uses 24-hour HS256 Bearer tokens with persisted, revocable sessions. Use [OpenAPI](docs/contracts/openapi.json) for request fields and [A01 diagrams](docs/diagrams/a01-auth.md) for flows and course alignment. Never commit credentials or tokens.

## Provider applications and review

Representative accounts use role `provider`. Their endpoints are under `/api/v1/provider`; signup uses `/api/v1/auth/register-provider`. Existing databases using the previous role value need a separately authorized [role migration](docs/design.md#provider-terminology-transition-d-51). This source update does not change stored accounts.

Provider representatives can read their profile and application history and submit revisions. Admins review applications and access the review queue. A revision does not replace the approved profile until approval; approval never clears suspension. See [OpenAPI](docs/contracts/openapi.json) for endpoints and fields and [A02 diagrams](docs/diagrams/a02-provider-review.md) for the flow.

## Routes

server.js declares the first path segment: `/api/v1/auth`, `/api/v1/providers`, `/api/v1/vehicles`, `/api/v1/bookings`, `/api/v1/provider` and `/api/v1/admin`. Each has a matching route file with relative paths and router.route() chains. Public `/providers` lists approved businesses; `/provider/...` is the signed-in representative workspace scoped to their business; `/admin/providers` is admin management. Guards stay on individual route chains. Existing URLs are unchanged; `/provider` alone has no endpoint (D-57).

## Tests

Check JavaScript with `npm run lint` and formatting with `npm run format:check`. Apply safe lint fixes with `npm run lint:fix` and format supported JavaScript, JSON and Markdown files with `npm run format`. Dependencies, generated output, environment files and the npm-generated lockfile are excluded from formatting.

Run all local tests without a database:

```text
npm test
```

Run all database integration tests with MONGO_URI supplied in your local .env (loaded automatically):

```text
npm run test:integration
```

All integration tests use `MONGO_URI` naming `dobby`. Files run sequentially, while race scenarios inside each test remain concurrent. Tests create indexes and clean up their synthetic fixtures. They share the application database; avoid running the app, demo or other database-writing commands during a test run. A replica set such as Atlas is required. Local `npm test` needs no database.

## Seed and reset

`npm run seed-admin` creates only the administrator needed for the Postman demo. It requires MONGO_URI to name dobby, plus locally supplied SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. If that email already belongs to an admin, the command leaves the account and password unchanged. It refuses an email belonging to a customer or provider. It does not create sample customers, providers, vehicles or bookings, or delete existing data. The Postman Runner creates its own demo data.

`npm run reset:test` deletes the entire shared dobby database selected by MONGO_URI and requires ALLOW_TEST_DB_RESET=true. It has no A/B owner option. No reset runs during ordinary startup or integration testing.

## Demo and response times

For Postman Runner, import the [collection](postman/dobby.postman_collection.json) and [example environment](postman/dobby-local.postman_environment.json), use the example admin credentials or enter your existing credentials locally, then run the required sections 01–12 before extra-credit sections 13–16 (36 requests total). Follow the [import and run steps](docs/demo-guide.md#postman-runner).

After creating the admin, preparing an available vehicle and starting the local API, supply the seeded admin credentials locally and run `npm run test:demo`. It generates the other credentials in memory and runs the [combined collection](postman/dobby.postman_collection.json) against loopback hosts only. See the [demo guide](docs/demo-guide.md), [use cases](docs/use-cases.md) and [API map](docs/diagrams/api.md).

Use Postman Runner's response times to inspect request duration against the three-second non-functional requirement. Record the request, status and measured time when collecting submission evidence. The dedicated performance runner has been removed (D-61).

The D-07 notation reference is supplied; D-10 and Saint’s integrated-main review remain open. Existing Newman development dependency findings are deferred under D-45; run only the trusted project collection against the local API.
