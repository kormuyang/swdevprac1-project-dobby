# Design readiness

No new product question currently blocks the two-person plan. The user settled rental windows/cutoffs, pickup-branch/price edits, reactivation, suspension, account separation and versioned review; engineering defaults close the remaining technical choices. See decisions.md for evidence and the latest selected rules.

## Prepared for implementation

- [Portable engineering practices](practices.md), independent of the local example.
- [Canonical OpenAPI](contracts/openapi.json), [HTTP policies](api-contract.md) and [generated endpoint inventory](api-endpoints.md).
- [Persistence fields/indexes](data-model.md) and [service/transaction boundaries](service-contracts.md).
- [Two-person task plan](implementation-plan.md), handoffs and shared-file owners.
- [T01–T42 acceptance checklist](acceptance-checklist.md), including scoped 3-second measurement conditions.
- Root AI instructions, Git exclusions, secret-free env template and dependency-free planning checker.

## Work still to execute

A00/A04 create and verify runnable package/scaffold/setup/seed scripts; feature work implements the contract; tests establish live behavior and races on an isolated DB. The runnable Postman collection, final implementation use cases/diagrams, contribution records and measurement evidence belong to the implementation tasks. Their absence is explicit, not an unanswered design question.

Any newly supplied instructor clarification or substantial scope change should update decisions/contracts before affected implementation. Course-specific API-diagram notation and extra-credit policy may still need confirmation for final delivery; neither prevents the current A00/B00 start.
