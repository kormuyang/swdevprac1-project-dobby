# Implementation plan

Saint = A; Poom = B. The A/B implementation is integrated in main through the linked task PRs. Under D-55, the app and tools share MONGO_URI naming dobby. Automated database/Newman and T41 checks passed; human review and course delivery decisions remain open.

## Who owns what?

- **A:** package/lockfile, app/server/config, auth middleware, User/Provider/ProviderApplication/AuthSession, provider review/suspension and their transaction boundaries, seed/reset and OpenAPI integration.
- **B:** Vehicle/Booking, dates/money, vehicle/discovery/booking routes/controllers/services/validators/serializers, and bulk booking cancellation.
- **Both:** own feature tests, Postman folders, use cases and sequence/API diagrams; review the other person's work.

A integrates shared app/package/config/OpenAPI edits. B proposes changes to those files for review. Use the exact names in [design](design.md) and [OpenAPI](contracts/openapi.json).

## Starting work

A00 provides the partial app setup. Poom can start B00 date/money rules and tests in parallel. Follow the [error-handling contract](design.md#context-and-shared-helpers) under D-39 and D-41.

A01/A02/B02/B03 implement needed transaction boundaries in the owning controllers or services (D-42). A03a coordinates the guard order and integration across A and B.

On November 13, the user authorized starting A01 on a branch stacked on A00 before G0 passes. G0 remains an integration prerequisite to verify before merging; this does not mark A00/B00 as passed.

After G0, continue A01/A02 and B01. B can build reads and validation while waiting for A03a. The booking and suspension work joins in the order below.

## Saint's tasks

| ID  | Work                                                                                                                                                         | Needs                                           | Check                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A00 | package.json/lock, .nvmrc, server.js, config/db.js, health/docs and dev/start scripts                                                                        | Agreed design                                   | Qualify Node 24 setup, required middleware and startup; Atlas acceptance remains separate |
| A01 | User/Provider/ProviderApplication/AuthSession models; auth routes/controllers/middleware, validation and serialization; signup/login/logout/me and req.actor | G0: A00+B00                                     | T01–T06, T11; auth parts of T36/T38                                                       |
| A02 | Provider application/profile and admin review; indexes, versions, history and review queue/detail                                                            | A01, B00 dates                                  | T07–T10; concurrent submissions; approval does not clear suspension                       |
| A03 | Provider guards and suspend/reactivate in A's feature services; call B's cancelNonCompletedForProvider                                                       | A01, B00, B01; B03 cancellation for integration | T33–T37 with B; rollback, old-session denial and no restoration                           |
| A04 | scripts/seed.js/reset-test-db.js, .env.example and setup README; mount all routers in server.js                                                              | A00–A03 and B models/routes                     | Clean setup, safe seed/reset and verified commands; T38 with B                            |
| A05 | Auth/provider use cases, sequence/API diagrams and Postman folders; review B's changes                                                                       | Related features                                | A's part of T40–T42; check persisted results as well as responses                         |

## Poom's tasks

| ID  | Work                                                                                     | Needs                                              | Check                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B00 | utils/dates.js/money.js and pure tests; plan validation/serialization                    | Design                                             | T19; same-day, 30/31 days, calendar/timezone, money and derived status boundaries; helpers throw ordinary errors with HTTP status and safe reason for invalid input |
| B01 | models/Vehicle.js/Booking.js, validators and serializers matching the design             | A00 package/config; A01 references for integration | Unique VIN, fixed fields, safe output and indexes                                                                                                                   |
| B02 | Public provider/vehicle discovery and own-vehicle management, windows and activation     | A01 auth/provider; A03a guards for writes          | T12–T18, T39; filtered totals and unchanged booked snapshots                                                                                                        |
| B03 | services/bookings.js, routes/controllers/serializers; create/read/date-edit/cancel       | B00/B01, A01 auth, A03a guards                     | T19–T30; real DB races for T22/T23; cancellation ready for A03b                                                                                                     |
| B04 | Provider/admin booking views and integration/race tests                                  | B03 + A03 integration                              | T25, T31–T39, especially suspension races and rollback                                                                                                              |
| B05 | Vehicle/booking use cases, sequence/API diagrams and Postman folders; review A's changes | Related features                                   | B's part of T40–T42; review approval/suspension integration                                                                                                         |

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

| Gate | Ready when                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------- |
| G0   | A00/B00 pass with matching fields, HTTP statuses and `{success:false,message}` errors, signatures, runtime and lockfile |
| G1   | A01/A02 pass: sessions, roles, review versions and privacy                                                              |
| G2   | A03a+B01–B03a pass: vehicles, cap, overlap, price/snapshots and cutoffs                                                 |
| G3   | A03b+B04 pass: atomic suspension/cancellation, emergency cancel, old-session denial, no restoration and races           |
| G4   | Setup, demo, diagrams, contributions and response-time results are ready; T01–T42 have results                          |

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

All database commands use MONGO_URI naming the shared dobby database. Integration files run sequentially. Reset requires its explicit flag and deletes the shared database. Performance requires an empty database. test:demo loads .env and runs the committed Newman collection. See README for setup.

The user authorized implementing B02–B05 sequentially on stacked branches while Saint reviews earlier B PRs. Finish each task with tests, relevant diagrams and a PR before starting the next. D-43 supersedes the earlier Saint-approval prerequisite.

## Integrated implementation

A03 provides the real cancellation helper and provider/user/vehicle guard protocol. B02–B04 integrate vehicle and booking writers, provider views, actual HTTP contention checks and rollback verification. A04/A05 provide guarded setup and the auth/provider delivery material; B05 consolidates the full A+B demo, rental fixtures, explicit B reset and response-time runner.

Each task PR records its reviewed commit, commands/results and verification limits. Merge review follows D-43; implementation choices follow D-44. Atlas acceptance, D-07/D-10 and Saint’s review of integrated main remain open. Newman dependency remediation is deferred under D-45. Local verification does not close G4 or all T01–T42 acceptance.

## Historical implementation: Course readability refactor (D-46)

The user approved moving simple reads into controllers, explicit actor/time service arguments, expanded handlers, a separate booking cancellation flow and app-level JSON parsing. Keep all existing folders, tests and scripts. Shared server/parser changes touch A-owned setup; booking/vehicle changes touch B-owned features under this request. Coordinate integrated review with Saint; no publishing or merge is implied.

Validate local rules and parser behavior with `npm test`, then run the existing HTTP/database checks with isolated A/B replica-set databases. T22/T23/T35 remain real-database checks; local mocks do not close them.

Local verification on November 16: `npm exec --yes --package=node@24 -- npm test` passed 41/41 checks under Node 24.22.3, including global-parser HTTP checks. Changed JavaScript syntax, OpenAPI JSON parsing and `git diff --check` passed. Neither dedicated test database connection was available, so Atlas integration/race checks and the added cancellation-after-deactivation case were not run. Dependencies were installed from the existing lockfile without changing versions.

## Historical implementation: Controller request validation (D-48)

Routes import named controller functions and retain authentication, roles and provider eligibility. Controllers call the existing validators directly and use local inputs, filters and IDs. Body/query rejection functions are ordinary checks in validators/request.js. Under D-52, the provider controllers now call the eligibility guard directly before validation. The request-validation middleware and route-local validation wrappers are removed. Endpoints, response shapes and transaction guards remain unchanged.

Local HTTP checks exercise invalid requests and permission order with synthetic actors. Real database integration/race acceptance remains separate and needs the dedicated A/B connections.

Verification on November 16: Node 24 `npm test` passed 42/42 local tests; `npm run lint`, `npm run format:check` and `git diff --check` passed. The new HTTP test covers request errors, permission ordering and a successful normalized vehicle input passed to a mocked service. It does not prove database transactions or races.

## Historical implementation: Express default parser errors (D-49)

The user requested removing jsonErrors. The server and test apps retain global express.json() and use Express default error handling. Malformed JSON returns 400, oversized JSON returns 413 and uncaught framework errors return HTML. Controller validation/domain errors retain the JSON envelope. Update clients and T38 expectations accordingly; no custom error handler replaces the removed middleware.

Verification: Node 24 local tests passed 42/42, including Express default 400/413/500 HTML behavior. Lint, formatting and diff checks passed. Database integration/race checks remain unrun without the dedicated connections.

## Historical implementation: Provider terminology (D-51)

The representative role, signup route, representative route prefix, function/module names, fixtures, docs and Postman now use provider terminology. Provider business records and representative User records remain separate. See the [transition notes](design.md#provider-terminology-transition-d-51) for the stored-role update; no database migration was executed.

Node 24 verification: 44/44 local tests, lint, formatting and diff checks passed. New checks compare model/OpenAPI roles and verify Postman paths and script syntax. Static local imports and OpenAPI references resolve. Neither A nor B test connection was available, so Atlas integration, database races and the full Newman journey remain unrun for this rename.

## Historical implementation: Provider eligibility in controllers (D-52)

The user requested removing approvedProvider middleware. The six provider vehicle handlers and two provider booking-read handlers check requireApprovedProvider before request validation. Routes retain protect/authorize. Vehicle write services still recheck provider eligibility in their owning transactions. No provider access rule is removed.

## Historical implementation: Resource routing (D-53)

The user chose resource grouping, unchanged URLs and router.route() chains. Four flat route files replace the mixed access-area files. Server and test hosts mount auth at /api/v1/auth and the other resource routers at /api/v1. The shared API fixture mounts the complete route set without optional extra routers. Controllers, transaction boundaries and OpenAPI paths remain unchanged.

Local routing checks compare every routed OpenAPI operation with its handler and exercise visitor/customer/provider/admin access, public-route fallthrough, unknown paths and the suspended-account logout exception. Authentication and controller handlers are mocked only in this routing test; it does not prove database behavior.

Verification on November 16: Node 24 local tests passed 45/45, including the full 33-operation routing/access matrix. Lint, format checks, static local imports and git diff checks passed. Neither dedicated test database connection was available, so Atlas integration, database races and the full Newman journey remain unrun.

## Historical implementation: Focused middleware restoration (D-54)

Restore feature validation middleware, normalized req.validated input, provider approval middleware, AppError and a shared JSON error handler. Keep in-transaction checks, resource routes, provider naming and the global-only rate limit. This supersedes the earlier controller-validation/parser-error implementation notes above. Validate with the local HTTP regression, full unit suite, lint and formatting; database acceptance remains separate.

Verification: Node 24.22.3 local suite passed 45/45, including request validation/permission order, normalized vehicle input, domain conflict forwarding, parser 400/413 and safe unexpected 500 responses. Lint, formatting and OpenAPI local-reference checks passed. Dedicated integration connections are unavailable; Atlas acceptance and concurrency checks were not run.

## Historical implementation: Shared database configuration (D-55)

Use one MONGO_URI naming dobby for the app, all integration tests, seed/reset and performance checks. Remove the A/B owner reset option. Integration files run sequentially and load .env explicitly through Node; deliberate race scenarios remain concurrent. Performance loads .env and retains its empty-database requirement. Reset still requires the flag and now clearly identifies that it deletes the shared database. Earlier database-isolation notes are historical. No database operation is authorized or performed as part of this configuration change.

Verification: Node 24.22.3 local suite passed 45/45; lint, formatting and diff checks passed. Database integration and performance were not run; no real environment file was read and no database was connected to or reset.

## Integrated database verification — November 16

After the user configured MONGO_URI with the explicit dobby database, `npm run test:integration` passed on Node 24.22.3: eight top-level tests plus four nested checks, 12/12 total, in about 111 seconds. This includes persisted signup/session revocation, provider review/versioning, vehicle ownership/discovery, immutable snapshots, concurrent VIN uniqueness, booking cap/overlap races, suspension races and rollback, and reactivation without restoring bookings. The combined Newman journey passed 35 requests and 57 assertions; its maximum response time was 637 ms. Tests used synthetic fixtures with their normal cleanup; no seed or database reset was run.

This closes the previously unrun integrated-suite/Newman execution for the current source. It does not establish the separate T41 performance protocol or close instructor/partner delivery decisions under T42. Connection details and tokens are not recorded.

## Earlier performance measurement — November 16

The Node 24.22.3 Atlas performance run recorded 150 requests across 15 endpoint cases, ten repetitions each, using two providers, ten vehicles and thirty historical bookings. All statuses matched expectations and every measured request met 3000 ms; maximum 566.19 ms (login). API process startup was recorded separately at 1708.81 ms. The runner completed with fixture cleanup and no seed/reset. Timing details are in the ignored reports/response-times.json.

The region setting was invalid, so the region metadata was removed from the generated report. The user subsequently confirmed AWS Singapore (ap-southeast-1); that region is now recorded in the report with its confirmation source. T41 passed for the recorded dataset and conditions; T42 delivery/instructor/partner checks remain open. Region validation now rejects URI/email-shaped values before connecting; a local regression checks rejected values and accepted region names/codes.

## Code consistency cleanup (D-56)

Keep the representative /provider workspace distinct from the public /providers directory, with URLs unchanged. Move public provider discovery to provider modules, share normalized ID/date helpers, extract pure lifecycle input rules, forward auth errors through the shared JSON handler and load the demo CLI environment consistently. Known unsupported JSON charset/encoding failures return safe 415 responses; malformed/incomplete bodies use 400. Update OpenAPI and local regressions before verification.

Verification: Node 24.22.3 passed 48/48 local tests and 12/12 database checks (eight top-level cases plus four nested checks). Newman passed 35 requests and 57 assertions, maximum 718 ms. The repeated Atlas performance measurement on AWS Singapore (ap-southeast-1) passed all 150 requests with expected statuses, maximum 958.38 ms. The latest timing artifact is reports/response-times.json; it replaces the prior generated report. Lint, formatting, 373 OpenAPI references and 251 static local imports passed. No seed, reset, database migration, commit or push ran.

## First-level routing mounts (D-57)

server.js now mounts six routers at the explicit auth/providers/vehicles/bookings/provider/admin prefixes. Route files use relative paths; provider and admin collect their workspace operations. Endpoint URLs and per-route middleware order are unchanged. Update every HTTP fixture and the routing matrix to use the same mounts. This supersedes the four-router structure in the historical D-53 notes. Preserve the uncommitted D-56 consistency cleanup.

Verification: Node 24.22.3 passed 48/48 local tests, including the 33-operation role/handler matrix and expanded unknown-path checks, plus 12/12 database integration checks. Newman passed 35 requests and 57 assertions (maximum 614 ms). The real server entry point passed all 150 Atlas performance requests (maximum 784.64 ms) with the six mounted routers. Lint, formatting and diff checks passed. Existing URLs and the uncommitted D-56 changes were preserved; no seed/reset, migration, commit or push ran.

## Feature service consolidation (D-58)

Move the bulk provider-cancellation function into services/bookings.js and the approved-provider guard into services/providers.js. Update imports and rollback-test interception to use the same exported service object, then remove the old modules. Preserve function bodies, signatures, transaction ownership and guard order. Validate with the local suite, lint/format checks and real database rollback/race integration tests. Prior D-56/D-57 changes remain uncommitted and are preserved.

Verification: Node 24.22.3 passed 48/48 local tests and 12/12 database checks, including suspension rollback and real booking races. Newman passed 35 requests and 57 assertions (maximum 630 ms). Lint, formatting and diff checks passed. The consolidated service exports load without connecting to a database, and services/ contains only bookings.js, providers.js and vehicles.js. No API change, seed/reset, migration, commit or push ran; performance was not rerun for this module-only move.
