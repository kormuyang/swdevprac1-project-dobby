# Implementation plan

Saint = A; Poom = B. The A/B implementation is integrated in main through the linked task PRs. Keep developer databases separate. Atlas acceptance and delivery decisions remain open.

## Who owns what?

- **A:** package/lockfile, app/server/config, auth middleware, User/Provider/ProviderApplication/AuthSession, company review/suspension and their transaction boundaries, seed/reset and OpenAPI integration.
- **B:** Vehicle/Booking, dates/money, vehicle/discovery/booking routes/controllers/services/validators/serializers, and bookingCancellation.
- **Both:** own feature tests, Postman folders, use cases and sequence/API diagrams; review the other person's work.

A integrates shared app/package/config/OpenAPI edits. B proposes changes to those files for review. Use the exact names in [design](design.md) and [OpenAPI](contracts/openapi.json).

## Starting work

A00 provides the partial app setup. Poom can start B00 date/money rules and tests in parallel. Follow the [error-handling contract](design.md#context-and-shared-helpers) under D-39 and D-41.

A01/A02/B02/B03 implement needed transaction boundaries in the owning controllers or services (D-42). A03a coordinates the guard order and integration across A and B.

On November 13, the user authorized starting A01 on a branch stacked on A00 before G0 passes. G0 remains an integration prerequisite to verify before merging; this does not mark A00/B00 as passed.

After G0, continue A01/A02 and B01. B can build reads and validation while waiting for A03a. The booking and suspension work joins in the order below.

## Saint's tasks

| ID | Work | Needs | Check |
| --- | --- | --- | --- |
| A00 | package.json/lock, .nvmrc, server.js, config/db.js, health/docs and dev/start scripts | Agreed design | Qualify Node 24 setup, required middleware and startup; Atlas acceptance remains separate |
| A01 | User/Provider/ProviderApplication/AuthSession models; auth routes/controllers/middleware, validation and serialization; signup/login/logout/me and req.actor | G0: A00+B00 | T01–T06, T11; auth parts of T36/T38 |
| A02 | Company application/profile and admin review; indexes, versions, history and review queue/detail | A01, B00 dates | T07–T10; concurrent submissions; approval does not clear suspension |
| A03 | Provider guards and suspend/reactivate in A's feature services; call B's cancelNonCompletedForProvider | A01, B00, B01; B03 cancellation for integration | T33–T37 with B; rollback, old-session denial and no restoration |
| A04 | scripts/seed.js/reset-test-db.js, .env.example and setup README; mount all routers in server.js | A00–A03 and B models/routes | Clean setup, safe seed/reset and verified commands; T38 with B |
| A05 | Auth/provider use cases, sequence/API diagrams and Postman folders; review B's changes | Related features | A's part of T40–T42; check persisted results as well as responses |

## Poom's tasks

| ID | Work | Needs | Check |
| --- | --- | --- | --- |
| B00 | utils/dates.js/money.js and pure tests; plan validation/serialization | Design | T19; same-day, 30/31 days, calendar/timezone, money and derived status boundaries; helpers throw ordinary errors with HTTP status and safe reason for invalid input |
| B01 | models/Vehicle.js/Booking.js, validators and serializers matching the design | A00 package/config; A01 references for integration | Unique VIN, fixed fields, safe output and indexes |
| B02 | Public provider/vehicle discovery and own-vehicle management, windows and activation | A01 auth/provider; A03a guards for writes | T12–T18, T39; filtered totals and unchanged booked snapshots |
| B03 | services/bookings.js, bookingCancellation.js, routes/controllers/serializers; create/read/date-edit/cancel | B00/B01, A01 auth, A03a guards | T19–T30; real DB races for T22/T23; cancellation ready for A03b |
| B04 | Company/admin booking views and integration/race tests | B03 + A03 integration | T25, T31–T39, especially suspension races and rollback |
| B05 | Vehicle/booking use cases, sequence/API diagrams and Postman folders; review A's changes | Related features | B's part of T40–T42; review approval/suspension integration |

B00 is merged in [PR #9](https://github.com/kormuyang/swdevprac1-project-dobby/pull/9). It is included in the shared local test command; verification evidence is recorded in the task PRs.

B01 is merged through PR #10 after A01/A02. Review timing follows D-43. See [module interfaces and data relationships](design.md#b01-module-interfaces). Shared validation, test scripts and configuration are included in the integrated review; B02–B04 supply endpoint and transaction checks.

## Joining booking and suspension

Split A03/B03 so neither waits for the other's unfinished service:

1. **A03a:** agree and integrate guard operations in the owning feature services, without importing cancellation.
2. **B03a:** bookings and the cancellation function, using the agreed guard order and caller session.
3. **A03b:** suspension calls B's cancellation in the same transaction.
4. **B03b/B04:** real race, rollback and end-to-end tests.

B02 writes also need the A03a guard agreement. Test-only fake dependencies can help while building, but they do not prove integration. Production must use the real functions and fail if a required dependency is missing.

## Integration gates

| Gate | Ready when |
| --- | --- |
| G0 | A00/B00 pass with matching fields, HTTP statuses and `{success:false,message}` errors, signatures, runtime and lockfile |
| G1 | A01/A02 pass: sessions, roles, review versions and privacy |
| G2 | A03a+B01–B03a pass: vehicles, cap, overlap, price/snapshots and cutoffs |
| G3 | A03b+B04 pass: atomic suspension/cancellation, emergency cancel, old-session denial, no restoration and races |
| G4 | Setup, demo, diagrams, contributions and response-time results are ready; T01–T42 have results |

## Review

Use small task branches such as `codex/a01-auth`. Sync main at the latest verified gate. Under D-43, Poom owns merge decisions with Codex-assisted review at each step; Saint reviews a fixed integrated main commit afterward. Coordinate shared files and lockfiles.

Each PR includes task/FR IDs, interface changes, test IDs, commands/results and anything unverified. Record who implemented/reviewed it, the commit/PR, test results and diagram changes. Update diagrams with the feature.

A reviews B's permissions, snapshots and guards. B reviews A's profile/suspension behavior. A task is done when its tests and relevant integration/race checks pass and the code, interfaces and diagrams agree.

## Commands

README documents setup and execution:

```text
npm run test:integration
npm run seed
npm run reset:test
npm run test:demo
```

Auth integration uses TEST_MONGO_URI with dobby_test_a; B integration uses TEST_MONGO_URI_B with dobby_test_b. Reset uses TEST_MONGO_URI with an explicitly allowed database and also needs an explicit flag. Seed only an explicitly named dev/test database. test:demo runs the committed Newman collection. A04 documents setup in README.

The user authorized implementing B02–B05 sequentially on stacked branches while Saint reviews earlier B PRs. Finish each task with tests, relevant diagrams and a PR before starting the next. D-43 supersedes the earlier Saint-approval prerequisite.

## Integrated implementation

A03 provides the real cancellation helper and provider/user/vehicle guard protocol. B02–B04 integrate vehicle and booking writers, company views, actual HTTP contention checks and rollback verification. A04/A05 provide guarded setup and the auth/provider delivery material; B05 consolidates the full A+B demo, rental fixtures, explicit B reset and response-time runner.

Each task PR records its reviewed commit, commands/results and verification limits. Merge review follows D-43; implementation choices follow D-44. Atlas acceptance, D-07/D-10 and Saint’s review of integrated main remain open. Newman dependency remediation is deferred under D-45. Local verification does not close G4 or all T01–T42 acceptance.
