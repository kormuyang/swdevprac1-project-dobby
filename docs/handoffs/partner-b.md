# Handoff: Poom — Partner B

You own vehicles, public discovery and booking rules/views/cancellation. This handoff is portable; no course example code is needed. Read root AGENTS.md, docs/practices.md, requirements.md, decisions.md, implementation-plan.md, data-model.md, service-contracts.md and contracts/openapi.json before implementation.

## Start here

1. Branch B00 from the shared planning baseline. Implement pure calendar/money functions and tests against the fixed clock; design Vehicle/Booking exactly as data-model.md. A owns ApiError; write tests/helpers while A00 supplies that small dependency. Do not invent a second error class or date/timezone implementation.
2. Sync the merged G0 scaffold, then B01 models/validation. Develop discovery/read endpoints and vehicle validations while A provides authentication and shared transaction guards.
3. Use A03a guards to implement B02 mutations and B03a booking/cancellation. Give A the narrow real cancellation export before full end-to-end integration. Finish race/view tests in B03b/B04.

## Files you own

Vehicle and Booking models, dates/money helpers, feature validators/serializers, vehicle/discovery/booking routes/controllers/services, bookingCancellation.js, their tests, your use cases/sequence/API diagram sources and collection folders. A owns auth/provider models and app/server/package/transaction/error infrastructure. Request A to mount your routers; do not edit shared files on both branches without coordination.

## Invariants to preserve

- Three counted records per user: confirmed and dueDate >= Thailand today, including ongoing. Cancellation/completion releases a slot by predicate; no negative counters.
- Date-only, inclusive, 1–30 days, starting today allowed, full rental fits vehicle availability window. Same-vehicle inclusive overlaps forbidden; customer may book different vehicles at overlapping dates.
- One specific vehicle; owner/provider/rate/total assigned by server. Rate and pickup branch snapshots never change with listing updates. Date edit keeps vehicle/provider/owner/snapshot/rate and recalculates duration/total.
- Customer edit/cancel before old start only; admin edit same cutoff, emergency cancel may cancel ongoing. No hard delete or restore. Company reads own bookings but never edits/cancels them.
- Approved company edits only current branch/rate and separate window/activation controls. VIN/model/specification fields fixed. Deactivation preserves old bookings. Approved owner may reactivate.
- Public discovery never returns bookings/applications/document links/customer data. Private list and individual IDs are both ownership scoped.

## Exact boundary with A

Import ApiError and transaction helpers with signatures in service-contracts.md. Use trusted req.actor. All mutations recheck provider state under provider guard. Do not rely solely on protect/authorize middleware for concurrency-sensitive rules.

Implement cancelNonCompletedForProvider in bookingCancellation.js with the caller session; it does not start a transaction or change provider status. Lock affected users/vehicles in agreed order, cancel confirmed records dueDate >= today, and return actual modified count. A calls it from suspension. Do not import A's providers service into booking service.

## Verification and delivery

Own T12–T32, T39 and your parts of T06/T09/T11/T33–T42. Real Atlas tests must establish cap/interval/suspension race invariants; test-only fake actors/guards cannot prove them. Test ID-scope denials, snapshots, timezone boundaries and repeated cancellations. Review A's review/suspension state handling. Keep your diagrams and contribution evidence current.

## Copyable AI request

```text
Implement task B00 (then stop for review of that task).
Read AGENTS.md and docs/handoffs/partner-b.md plus the linked contracts.
Follow docs/implementation-plan.md and file ownership. Do not require example/.
Implement this task's pure rules/tests without changing A-owned infrastructure.
Use the agreed ApiError contract when A00 lands; do not duplicate it.
Report files changed, acceptance IDs checked, command/results and remaining dependencies.
Do not claim real database concurrency guarantees from pure tests or fake dependencies.
```

Replace B00 with the next task ID when ready. Keep your branch and database separate; tests use explicit isolated test DB names and synthetic data.
