# Working together and with AI

The full plan is [implementation-plan.md](implementation-plan.md), the portable rules are [practices.md](practices.md), and per-person starting prompts are [Saint (A)](handoffs/partner-a.md) and [Poom (B)](handoffs/partner-b.md). Root AGENTS.md points AI tools to these contracts. No example/tutorial directory is required.

## Ownership and integration

A owns package/app/server/config, authentication and company/profile-review infrastructure, shared errors/transactions and suspension orchestration. B owns date/money helpers, vehicles, discovery, bookings and the cancellation primitive. The [service contract](service-contracts.md) fixes the boundary. A owns integration edits to shared app/package/OpenAPI files; B proposes reviewed changes rather than independently editing a competing copy. Both own their feature tests and diagrams.

Use separate clones/worktrees, feature branches and Atlas databases. Merge a small scaffold/error foundation first while B develops pure rules; later features follow explicit dependencies. Do not start production with no-op fake services merely to hide an unfinished dependency. Integration requires actual guard/session calls and real DB tests.

## Review and contribution evidence

Each PR states task ID, FR IDs, contract/schema impact, acceptance IDs checked, commands/results and unverified cases. The other person reviews. Record actual implementation/review/diagram contributions; both must code and document. Do not fabricate a 50/50 history.

Suggested contribution row:

```text
Task | Implementer | Reviewer | Commit/PR | Acceptance IDs and run evidence | Diagram/doc changes
```

Keep PRs small, sync main at the latest passed gate, and coordinate contract changes before dependent work merges. Tests use synthetic fixtures; secrets and real personal/business documents never enter commits, logs or AI prompts. Local reference example and real env files are ignored.

## AI task template

```text
Implement [A00/B00/...], following AGENTS.md and my partner handoff.
Read docs/practices.md, requirements.md, decisions.md and implementation-plan.md.
Use contracts/openapi.json, api-contract.md, data-model.md and service-contracts.md.
Inspect current files first and respect module/file ownership.
Implement only the named work package, update its tests/docs/diagrams,
and report acceptance IDs, actual command/results and remaining dependencies.
Do not require example/ or claim runtime guarantees from a planned contract.
```

For each task, provide changed files, relevant interface and acceptance IDs; the whole course archive is unnecessary. User answers prevail over old evidence. If a new domain ambiguity materially blocks implementation, identify it precisely; do not reopen settled questions.
