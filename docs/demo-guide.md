# Demo guide

The assignment allows seven minutes plus up to three minutes for questions. Use the [A-only Newman collection](../postman/a-auth-provider.postman_collection.json) for the repeatable authentication and provider review slice. Run it only after the A02/A03 routes are integrated into the local API and a seeded admin is available.

## Seven-minute outline

| Time | Show | Evidence |
| --- | --- | --- |
| 0:00–0:30 | Scope and seeded local setup | Explain that the demo uses synthetic records and a local replica-set database. |
| 0:30–1:15 | Company signup | Show the pending company account, v1 application, and returned session. |
| 1:15–2:20 | Review and profile revisions | Approve v1, submit v2, reject it with a reason, show both versions, then approve corrected v3. |
| 2:20–3:20 | Suspension and logout | Suspend the approved provider, show old-session denial and blocked login, then show logout still works. |
| 3:20–4:00 | Reactivation | Reactivate with a resolution note, log in again, and read the approved v3 profile. |
| 4:00–6:20 | B vehicle and booking journey | Add the B-owned vehicle, discovery, booking, cancellation, and suspension-cancellation cases after B APIs and their integration are ready. Do not present planned endpoints as completed. |
| 6:20–7:00 | Evidence and limits | Separate Newman assertions, persisted database results, unrun tests, and remaining T40/T41 work. |

The current A collection stops after reactivation. B vehicle and booking steps are placeholders in the presentation outline, not requests in the collection. A full T40 run needs the integrated A+B API, suitable seeded fixtures, and database-backed assertions. T41 latency measurement is separate and needs recorded conditions and results.

## Run the A collection

1. Use Node 24 and a local replica-set database named `dobby_dev_a` or `dobby_test_a`.
2. Set `MONGO_URI` and `JWT_SECRET` for the API process, then start the API.
3. Run `npm run seed` using the same local database and set the seed admin credentials locally.
4. Supply `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to `npm run test:demo`. The runner creates synthetic company data and does not read `.env`.
5. Check the final pass/fail result. Newman suppresses request and response output so generated tokens and passwords are not printed.

The runner restricts its target to localhost, 127.0.0.1, or `::1`. Do not point it at a shared service. The application is still responsible for selecting the guarded local database.

## Course and verification notes

- The collection covers auth, initial company application, review, revision history, suspension, logout, and reactivation. It does not cover B endpoints or claim full T40 completion.
- Run integration tests against the explicit `dobby_test_a` database to verify saved state and transaction behavior; Newman responses alone are not persistence evidence.
- The diagrams are Mermaid engineering diagrams. D-07 remains open, so they are not presented as the instructor's required UML Profile for API.
- D-10 remains open. Confirm the required AI disclosure and any extra-credit or teaching-video expectations before final submission.
