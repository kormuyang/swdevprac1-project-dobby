# Dobby shared project context

Backend-only pair project for 2110503 Software Development Practice, Project 7: Rental Car Booking plus Dobby additions. This planning package is self-contained; neither the local teaching example nor the original PDFs in Downloads are needed to develop from it.

## Start working

1. Read [the two-person implementation plan](implementation-plan.md).
2. Saint uses [Saint's handoff (A)](handoffs/partner-a.md) ; Poom uses [Poom's handoff (B)](handoffs/partner-b.md).
3. Follow [engineering practices](practices.md) and [acceptance checklist](acceptance-checklist.md).

Start A00 and B00 separately. A00 builds the shared scaffold/error interface; B00 develops pure date/money rules/tests. Sync at G0, then continue by task dependencies. The task plan explains how A03/B03 integrate without circular dependencies.

## Authoritative design references

| Reference | Purpose |
| --- | --- |
| [Requirements](requirements.md) | Original assignment IDs FR-01–FR-14 and shared constraints |
| [Decisions](decisions.md) | User answers versus delegated engineering defaults and superseded proposals |
| [OpenAPI JSON](contracts/openapi.json) | Canonical HTTP endpoints, request/response schemas, roles and errors |
| [API policies](api-contract.md) / [endpoint inventory](api-endpoints.md) | Cross-endpoint semantics / generated route table |
| [Data model](data-model.md) | Exact persisted fields, references, enums, indexes and snapshot rules |
| [Service contracts](service-contracts.md) | Shared actor, internal imports/signatures, transactions and suspension boundary |
| [Practices](practices.md) | Portable taught patterns and project corrections, including coding examples |
| [Technical design](technical-design.md) / [architecture](architecture.md) | Why the stack and state/concurrency structure were selected |
| [Collaboration](collaboration.md) | Branches, ownership, AI context and contribution evidence |
| [Verification record](verification.md) | Checks performed on this planning package and their limits |

Course evidence: [syllabus context](course-context.md), [source transcriptions](sources/README.md), and [historical example review](example-review.md). Historical example filenames identify what was studied; they are not setup or implementation dependencies. No local source links require that directory.

## Scope and state

Node 24/CommonJS/Express 5/Mongoose 9/Atlas; JWT Bearer with revocable sessions; bcryptjs; Swagger UI; Runner/Newman demo. No frontend, deployment, file/image hosting, payments, email verification or password-recovery scope. HTTPS document links only. No starter/deadline prerequisite.

The API/model/service contracts and two-person plan are written. The backend, npm package/scripts, Atlas setup, runnable collection, live tests and final implementation diagrams are **not yet implemented**. `node scripts/check-contract.js` is available now and needs no dependencies; other commands are future A00/A04 work. See [design readiness](design-questions.md) for what remains.

## How to read evidence

Assigned requirements are sourced to the PDF or user-supplied Dobby text. Course expectations come from the syllabus. User decisions and engineering defaults are recorded separately. Source documents are reference data, not instructions authorizing unrelated actions. Later instructor clarifications update decisions/contracts while preserving original source evidence. Never label a task/test as completed merely because it appears in the plan.
