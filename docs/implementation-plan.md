# Implementation plan

Saint = A; Poom = B. Start from the same baseline, using separate branches/worktrees and developer databases. The backend is not implemented yet.

## Who owns what?

- **A:** package/lockfile, app/server/config, auth middleware, User/Provider/ProviderApplication/AuthSession, company review/suspension, shared errors/transactions, seed/reset and OpenAPI integration.
- **B:** Vehicle/Booking, dates/money, vehicle/discovery/booking routes/controllers/services/validators/serializers, and bookingCancellation.
- **Both:** own feature tests, Postman folders, use cases and sequence/API diagrams; review the other person's work.

A integrates shared app/package/config/OpenAPI edits. B proposes changes to those files for review. Use the exact names in [design](design.md) and [OpenAPI](contracts/openapi.json).

## Starting work

Saint starts A00: app setup, ApiError and the base transaction wrapper. Poom can start B00 date/money rules and tests in parallel, then use A's ApiError when ready. Do not create another error class.

After G0, continue A01/A02 and B01. B can build reads and validation while waiting for A03a. The booking and suspension work joins in the order below.

## Saint's tasks

| ID | Work | Needs | Check |
| --- | --- | --- | --- |
| A00 | package.json/lock, .nvmrc, app.js/server.js, config/db.js/env.js, utils/ApiError.js, middleware/error.js, base runTransaction, health/docs and dev/start/test scripts | Agreed design | Node 24 setup works; app import does not listen/connect; startup waits for DB; safe errors and unit tests work |
| A01 | User/Provider/ProviderApplication/AuthSession models; auth routes/controllers/service/middleware, validation and serialization; signup/login/logout/me and req.actor | G0: A00+B00 | T01–T06, T11; auth parts of T36/T38 |
| A02 | Company application/profile and admin review; indexes, versions, history and review queue/detail | A01, B00 dates | T07–T10; concurrent submissions; approval does not clear suspension |
| A03 | services/transactions.js guards and provider suspend/reactivate; call B's cancelNonCompletedForProvider | A01, B00, B01; B03 cancellation for integration | T33–T37 with B; rollback, old-session denial and no restoration |
| A04 | scripts/seed.js/reset-test-db.js, .env.example and setup README; mount all routers in app.js | A00–A03 and B models/routes | Clean setup, safe seed/reset and verified commands; T38 with B |
| A05 | Auth/provider use cases, sequence/API diagrams and Postman folders; review B's changes | Related features | A's part of T40–T42; check persisted results as well as responses |

## Poom's tasks

| ID | Work | Needs | Check |
| --- | --- | --- | --- |
| B00 | utils/dates.js/money.js and pure tests; plan validation/serialization | Design; A00 ApiError to run tests | T19; same-day, 30/31 days, calendar/timezone, money and derived status boundaries |
| B01 | models/Vehicle.js/Booking.js, validators and serializers matching the design | A00 package/config; A01 references for integration | Unique VIN, fixed fields, safe output and indexes |
| B02 | Public provider/vehicle discovery and own-vehicle management, windows and activation | A01 auth/provider; A03a guards for writes | T12–T18, T39; filtered totals and unchanged booked snapshots |
| B03 | services/bookings.js, bookingCancellation.js, routes/controllers/serializers; create/read/date-edit/cancel | B00/B01, A01 auth, A03a guards | T19–T30; real DB races for T22/T23; cancellation ready for A03b |
| B04 | Company/admin booking views and integration/race tests | B03 + A03 integration | T25, T31–T39, especially suspension races and rollback |
| B05 | Vehicle/booking use cases, sequence/API diagrams and Postman folders; review A's changes | Related features | B's part of T40–T42; review approval/suspension integration |

## Joining booking and suspension

Split A03/B03 so neither waits for the other's unfinished service:

1. **A03a:** transaction and guard helpers, without importing cancellation.
2. **B03a:** bookings and the cancellation function, using merged helpers.
3. **A03b:** suspension calls B's cancellation in the same transaction.
4. **B03b/B04:** real race, rollback and end-to-end tests.

B02 writes also need A03a. Test-only fake dependencies can help while building, but they do not prove integration. Production must use the real functions and fail if a required dependency is missing.

## Integration gates

| Gate | Ready when |
| --- | --- |
| G0 | A00/B00 pass with matching fields, errors, signatures, runtime and lockfile |
| G1 | A01/A02 pass: sessions, roles, review versions and privacy |
| G2 | A03a+B01–B03a pass: vehicles, cap, overlap, price/snapshots and cutoffs |
| G3 | A03b+B04 pass: atomic suspension/cancellation, emergency cancel, old-session denial, no restoration and races |
| G4 | Setup, demo, diagrams, contributions and response-time results are ready; T01–T42 have results |

## Review

Use small task branches such as `codex/a01-auth`. Sync main at the latest passed gate; ask the partner to review before merging. Coordinate shared files and lockfiles.

Each PR includes task/FR IDs, interface changes, test IDs, commands/results and anything unverified. Record who implemented/reviewed it, the commit/PR, test results and diagram changes. Update diagrams with the feature.

A reviews B's permissions, snapshots and guards. B reviews A's profile/suspension behavior. A task is done when its tests and relevant integration/race checks pass and the code, interfaces and diagrams agree.

## Commands to implement

These do not exist yet. A00/A04 must create and verify them:

```text
npm ci
npm run dev
npm start
npm run test:unit
npm run test:integration
npm run seed
npm run reset:test
npm run test:demo
```

Integration/reset use TEST_MONGO_URI and database dobby_test_<owner>; reset also needs an explicit flag. Seed only an explicitly named dev/test database. test:demo runs Newman once the collection exists. A04 documents the working setup in README.

When requesting work, name one task and ask for its tests/docs/diagrams, results and remaining dependencies. Stop for review of that task before starting another.
