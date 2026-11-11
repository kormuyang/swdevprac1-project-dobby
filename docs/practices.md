# Dobby engineering practices

This is the portable practice guide for the pair and their AI tools. It is self-contained: no reference project, tutorial repository or unpublished attachment is required. It records taught patterns plus the corrections needed for this project's rules. Follow the current contract and user decisions over historical examples.

## 1. Use the familiar backend stack and keep modules focused

Use Node 24, npm, CommonJS JavaScript, Express 5, Mongoose 9 and Atlas. Pin one tested dependency set in package-lock and use `npm ci` after it exists. Use nodemon only in development. No frontend, file hosting, payments, microservices or extra identity workflows.

A route declares method/path, authentication, role and validation. A controller translates HTTP input/output. A service owns business rules and transactions. A model defines persisted fields, validation, references and indexes. A serializer explicitly selects public/private output. Keep generic helpers small; no generic repository framework.

```text
app.js / server.js
config/           database/config validation
routes/           auth, company, vehicles, bookings, admin
controllers/      thin HTTP adapters
services/         auth, providers, vehicles, bookings, transactions
models/           User, Provider, ProviderApplication, Vehicle, Booking, AuthSession
middleware/       protect, authorize, company-state, errors, request validation
utils/            dates, money, ApiError, serializers
scripts/          seed/reset/check-contract
tests/            unit/integration
postman/          collection and secret-free environment template
```

`app.js` exports the application without connecting/listening. `server.js` loads/validates configuration, awaits database readiness, then listens. Keep DB/session setup import-safe so unit tests do not contact Atlas.

### Readability is a shared requirement

Use descriptive variable/function names, explicit braces for conditions and loops, and line breaks for long conditions/calls. Split separate checks into named functions with a short main flow. Avoid nested ternaries and compressed one-line control flow. Keep comments focused on purpose or non-obvious rules. Readability matters in scripts as well as backend features; do not optimize for fewer lines.

## 2. Treat the API contract as the shared interface

`contracts/openapi.json` is authoritative for HTTP shapes. `data-model.md` owns persistence; `service-contracts.md` owns internal imports/signatures. Change the contract first when behavior changes and notify the partner before merge.

Serve the same committed OpenAPI file through swagger-ui-express. This preserves Swagger practice without duplicating annotations and a separate specification. Do not hand-maintain a second spec through swagger-jsdoc. Import the spec into Postman, then preserve/extend assertions in the collection as the interface evolves. The eventual collection must exercise actual behavior, not just document successful shapes.

Use `/api/v1`, Mongo IDs serialized as `id`, success/data envelopes, consistent code/message errors and capped pagination. Do not leak `_id`, `__v`, guard revisions, password hashes or session internals through default document serialization. State unknown-field policy explicitly: reject unknown payload/query fields, except standard request headers.

## 3. Never trust client ownership, roles or computed totals

Customer registration hardcodes `role = user`; company registration hardcodes `role = company`. Seed admins through a controlled script. Derive user/provider from verified actor context; never accept them from booking/vehicle payloads. Derive rates, duration and total server-side.

Protect both list and individual reads, not only mutations. Unauthorized access to another owner's private ID returns 404; a known but forbidden role/state returns 403 before resource lookup. Public discovery must not populate bookings, applications, document URLs or customer information.

Mongoose `populate` is a field-selection mechanism, not authorization. Every query is scoped first; populated fields are selected explicitly. Company booking responses intentionally include only the required customer name/email/telephone and approved company scope.

## 4. Keep authentication close to the taught JWT pattern, with real logout

Use bcryptjs salt rounds 10 and hidden password hash. Validate password length as 8–72 UTF-8 bytes. Hash only when password changes; never hash an already stored hash during an unrelated save.

```js
// Pattern only: adapt the field name to User.passwordHash.
schema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});
```

Never use findByIdAndUpdate to write passwords around this hook. No password-update endpoint exists in scope. Use async pre middleware without a callback/next parameter for Mongoose 9.

JWT verification requires signature, expected HS256 algorithm and expiry. Each token also identifies a persisted AuthSession; require matching user/session, not revoked and not expired. Read current role/provider state from DB. Deleting a browser cookie alone does not revoke Bearer credentials.

24-hour sessions, multiple logins and current-session logout are the defaults. Suspended companies have no protected company reads/writes, including with older tokens. Logout is still allowed, without company data access. Pending/rejected applicants may inspect their own application status/history. No refresh token/cookie auth/email verification/password recovery scope.

## 5. Validate rather than forwarding request objects

Reject non-string email/IDs/dates, operator objects and unrecognized fields. Allowlist query filters, sort names and page limits. Never perform `Model.create(req.body)` or `findByIdAndUpdate(id, req.body)` for these APIs. Build a new allowed object.

Use Mongoose constraints plus request validation; unique indexes are the final authority under races. Translate duplicate index names to domain conflicts, never return raw database diagnostics. Normalize login email lowercase and trim/uppercase VIN. Registration-number uniqueness is a project identity rule, not legal certification.

Apply Helmet, a small JSON body limit and rate limits with correct `windowMs`. No permissive CORS/cookie middleware is needed for the Postman-only backend. Do not copy overlapping sanitizer middleware blindly, particularly middleware that tries to replace Express 5 request getters. Never treat sanitization as a substitute for typed, allowed query construction.

## 6. Use one calendar and one money representation

Store rental dates as real validated YYYY-MM-DD calendar values. Thailand today comes from the shared injectable clock, not server timezone. Count inclusive days: ordinal(dueDate) - ordinal(startDate) + 1, from 1 to 30. An interval ending on the 5th blocks the entire 5th and releases the vehicle on the 6th.

Overlap is `existing.startDate <= requested.dueDate && existing.dueDate >= requested.startDate` for non-cancelled records. Exclude the current booking on an edit. Start-today is allowed; past starts are not. Respect vehicle availableFrom and inclusive availableUntil (null = no planned end).

Store THB amounts as integer satang, positive daily rate, safe integer totals. Never use floating-point decimal currency calculations. Snapshot branch/vehicle/rate at booking creation. Branch/rate changes affect new bookings only. Date edits retain original rate and booked branch while recalculating days/total.

## 7. Derive completion, retain history and enforce cutoffs

Persist confirmed/cancelled state; derive upcoming/ongoing/completed from dates. A customer's counted bookings are confirmed with dueDate >= today, including ongoing rentals. A repeated cancellation must never decrement a counter again. Prefer a guarded count query to counters requiring midnight maintenance.

Customers edit/cancel only before original startDate. Admin date edits have the same cutoff, but emergency cancellation can cancel ongoing rentals. Completed/cancelled history remains historical. DELETE booking is cancellation, never hard deletion; a cancelled booking is not restorable.

Companies can change pickup branch/rate; vehicle identity/specification fields are fixed. Activation and availability are separate operations. Deactivation blocks new bookings but preserves existing ones. Window changes may not exclude upcoming/ongoing bookings. Reactivation requires approved ownership.

## 8. Separate profile review from provider suspension

Keep immutable submitted application versions with pending/approved/rejected state and reviewer/reason/timestamps. One pending version per provider. Rejecting a version never erases earlier applications. A company's current approved profile remains in use while a revision is pending/rejected.

Review approval atomically switches the approved-profile pointer. Suspension is independent and cannot be cleared by profile approval. Suspend cancels all upcoming and ongoing confirmed bookings together with provider suspension. Reactivation never restores cancellations. Store actor/time/reason evidence for review and lifecycle actions.

Store exactly one HTTPS document URL, without fetching, hosting or classifying documents. Restrict the URL to owner/admin responses. Do not build automated link-access verification; admin review/rejection is sufficient.

## 9. Make concurrency a business invariant

A transaction with count-then-insert alone can still allow write skew. All cooperating mutations must update shared guard documents and re-read validation under the same transaction: provider first, affected users sorted by ID, affected vehicles sorted by ID. The service contract defines the exact ownership/order.

Always pass the same session to every read/write inside a transaction. Never use Promise.all for database operations within a single transaction. Retry only transient transaction failures with the agreed time/attempt budget. Do not send HTTP responses or external effects inside a retryable callback. Build indexes before running transactions/tests.

Use provider guards to serialize suspension, review, listing changes and bookings; user guards to serialize cap changes across providers; vehicle guards for competing interval/snapshot/window changes. No production booking or suspension path may bypass the shared service.

## 10. Test the promise, not the implementation

Use node:test for pure rule tests with a fixed clock. Integration tests use an isolated Atlas test database, actual indexes and native HTTP fetch. Test both allowed behavior and denial/persistence outcomes. Mocking a count cannot prove race safety; use real concurrent integration requests for cap/overlap/suspension.

Postman Runner/Newman provides the required repeatable demo. Keep dynamic generated IDs/tokens as runtime variables, synthetic user/company data and one synthetic HTTPS URL. Retain run evidence; do not label a planned collection or a mock pass as a successful live demo.

Seed/reset commands must verify an explicit test/dev database name before destructive work and never touch an unspecified database. Separate A/B/test databases; avoid test suites sharing mutable collections concurrently unless deliberately testing races.

## 11. Collaborate with file ownership and small reviews

A owns platform/auth/provider review; B owns vehicles/bookings. Only the owner changes shared foundational files unless coordinated. Use feature branches and small PRs with requirement IDs, API/schema changes and verification results. Review the partner's boundary changes before merge. Do not commit directly into another person's working branch.

Each person writes their own code, tests, use cases and sequence/API diagram sources, with cross-review. Record actual contributions. Use the provided handoff prompt, and let the AI read AGENTS.md and contracts before editing. No example folder is needed.

Do not deploy, publish, push, send messages or add cloud integrations merely because a document mentions them. This plan authorizes local preparation; later implementation follows the user's task scope. Keep secrets in local env files, never source/fixtures/docs/AI prompts.

## 12. Portable definition of done

A task is done when agreed behavior, adverse cases and relevant race tests pass; contract and diagrams match; the partner's boundary tests pass; no credentials/private data leaked; and its PR states exactly what was verified and what was not. A planned task is not a completed feature.

Official references for library-specific details are collected in [technical-design.md](technical-design.md) and [example-review.md](example-review.md). The working rules above are sufficient even if the original example and Downloads files are absent.
