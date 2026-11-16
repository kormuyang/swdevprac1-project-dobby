# Demo guide

Run the [combined collection](../postman/dobby.postman_collection.json) through `npm run test:demo` after seeding and starting the local API. The standalone command loads .env; supply the seed administrator credentials there or through the process environment. The runner uses loopback hosts only, generates synthetic account credentials in memory and prints no tokens or response bodies. Each run creates unique records; repeat with fresh data or use the explicitly guarded test reset.

## Seven-minute outline

| Time      | Show                                                   | Purpose                                                                       |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 0:00–0:30 | Scope and synthetic replica-set setup                  | Explain roles and the test environment.                                       |
| 0:30–1:30 | Signup, provider review and profile versions           | Show approval and preservation of the approved profile during review.         |
| 1:30–2:30 | Vehicle creation and date-filtered discovery           | Show approved ownership and availability.                                     |
| 2:30–4:00 | Booking, listing change and date edit                  | Show server pricing and preserved snapshots/rates.                            |
| 4:00–4:45 | Customer cancellation and admin emergency cancellation | Show cutoff differences and retained history.                                 |
| 4:45–6:00 | Suspension and reactivation                            | Show cancellation, protected-session denial and no restoration.               |
| 6:00–7:00 | Test evidence and remaining limits                     | Use PR results, the separate timing artifact and actual contribution records. |

Allow up to three minutes afterward for questions. The collection asserts the API journey; integration tests separately inspect saved data and real database races. Response-time measurement uses `npm run test:performance` and the T41 protocol in the acceptance checklist. A local measurement is not an Atlas result.

## Delivery checks

- Update the [use cases](use-cases.md), [API map](diagrams/api.md), design sequence diagrams and [contributions](contributions.md) when the implementation changes.
- D-07: confirm the instructor's UML Profile for API notation. Current Mermaid diagrams are engineering diagrams.
- D-10: confirm AI disclosure, extra credit and teaching-video expectations. No institution-specific policy is inferred.
- Review and merge timing follow D-43; Saint reviews integrated main afterward.
- D-45 defers the existing Newman dependency findings. Use the trusted project collection against the local API; remediation remains open.
