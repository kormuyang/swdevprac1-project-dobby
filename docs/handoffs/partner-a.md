# Handoff: Saint — Partner A

You own platform/auth/company review and lifecycle orchestration. This handoff is portable and does not require course example code. Read root AGENTS.md, docs/practices.md, requirements.md, decisions.md, implementation-plan.md, data-model.md, service-contracts.md and contracts/openapi.json before implementation.

## Start here

1. Create a branch for A00 from the shared planning baseline. Inspect current files first; do not overwrite another person's work. Implement import-safe app/server/config/error setup and package scripts per plan. Use Node 24/npm/CommonJS, Express 5 and Mongoose 9; install a compatible version set and commit lockfile. This task introduces code; the planning package itself has no application yet.
2. Coordinate the tiny B00 date/money boundary so G0 lands; A owns ApiError and base transaction wrapper, B owns dates/money. A00 introduces the wrapper API; after G0 it can use B00 helpers. Use one owner per file.
3. Continue A01 auth/models, then A02 versioning. Implement base transaction wrapper before atomic company signup. A03a adds guard helpers using the shared User/Provider/Vehicle schemas. Wait for real B cancellation only for A03b integration, not for auth/review work.

## Files you own

Root package/config/app/server/setup files; User/Provider/ProviderApplication/AuthSession; auth middleware; shared ApiError/error/transaction infrastructure; auth/provider/admin-review routes/controllers/services/serializers; admin/provider seed/reset orchestration; OpenAPI baseline integration; your tests/diagrams and collection folders. B owns Vehicle/Booking, pure dates/money and booking cancellation primitive. Do not reimplement those in A modules.

## Exact boundary with B

Use req.actor and service signatures in service-contracts.md. A03b opens one transaction and calls B's cancelNonCompletedForProvider with the same session after taking the provider guard. Do not return successful suspension before cancellations commit. A profile approval can change approvedApplicationId but must not clear suspension. Reads never leak pending profile/document/account secrets into public endpoints.

Company status and application review state are distinct. One pending immutable application, unique registration/email indexes, reviewer/reason/time and all versions preserved. Customer signup cannot choose role. JWT sessions make logout revocation real. Suspended accounts have no protected company reads/writes; logout remains available without data access.

## Verification and delivery

Own T01–T11 plus your parts of T33–T42. Test duplicate/concurrent submissions and atomic signup rollback, not only happy-path login. Review B's authorization, snapshot and transaction integration. Record actual commands and results; stubs/fakes do not certify Atlas transactions. Follow G0–G4, include use cases and sequence/API diagram source for your modules, and record contributions.

## Copyable AI request

```text
Implement task A00 (then stop for review of that task).
Read AGENTS.md and docs/handoffs/partner-a.md plus the linked contracts.
Follow docs/implementation-plan.md and file ownership. Do not require example/.
Implement only this task, with meaningful checks and documentation updates.
Do not invent routes/fields or silently change the API/service contracts.
Report files changed, acceptance IDs checked, command/results and remaining dependencies.
Do not claim the entire backend or a live integration is complete after scaffold/unit tests.
```

Replace A00 with the next task ID only when its dependencies are ready. Both developers can use separate AI sessions with their respective handoff, feature branch and developer database.
