# Architecture and implementation direction

Updated 2026-11-11. The user delegated the technology choice with ease of development as the priority and stated greater familiarity with MongoDB. This document selects the stack; its detailed domain defaults remain proposals where marked. No Dobby backend has been implemented. The user has now supplied `example/` as course-practice evidence; see [example review](example-review.md) and the selected [technical design](technical-design.md). The technical design supersedes earlier explicitly proposed auth/identity defaults below.

## Selected stack

| Area | Choice | Reason |
| --- | --- | --- |
| Database | MongoDB Atlas | Allowed by assignment; already more familiar to the user; matches the MongoDB course path |
| Backend | Node.js and Express | Matches the syllabus/tutorial direction and keeps one runtime |
| Language | JavaScript | Keeps the selected Express/Mongoose application straightforward |
| Data access | Mongoose | Schemas and validation around users, providers, vehicles, and bookings; follows the course's Mongoose material |
| Application shape | One REST API application | Shared authorization and booking rules without separate services or message infrastructure |
| Demo | Postman collection with Runner or Newman | Explicit course expectation |

Select compatible supported package versions during implementation; starter code and deadlines are not current design prerequisites. No hosting provider is selected here. MongoDB is chosen for team fit, not because relational data disappears: ownership, references, uniqueness, and cross-document consistency still need deliberate handling.

Suggested organization: feature routes/controllers, shared authentication/authorization middleware, Mongoose models, and service functions for booking and company lifecycle rules. Keep controllers thin enough that the same rule is used on create, edit, and suspension. Avoid generic repository frameworks, microservices, event buses, and a separate frontend for this scope.

## Proposed data model

This table is a conceptual summary. The finalized persistence contract is in data-model.md and HTTP schemas are in contracts/openapi.json; those detailed contracts take precedence over earlier sketch wording.

| Collection | Main data and relationships |
| --- | --- |
| Users | Name, telephone, normalized login email, password hash, role: user/company/admin; company representatives reference their provider |
| Providers | Stable company identity, representative reference, operational status, latest approved profile reference, suspension reason/time; separate operational eligibility from application review state |
| ProviderApplications | Provider reference, version, submitted legal name/registration number/address/telephone/company email, one HTTPS document URL, pending/approved/rejected state, submitted/review timestamps, reviewer and rejection reason |
| Vehicles | Immutable provider reference, globally unique VIN, model, transmission/fuel types, seats, pickup branch, rental rate, active flag |
| Bookings | Immutable customer/provider references, vehicle reference, inclusive rental startDate/dueDate, server-calculated price snapshot and total, confirmed/cancelled state with completion derived when Thailand calendar date is later than dueDate, cancellation reason/time |
| AuthSessions | Selected: random session ID referenced by signed JWT, user reference, expiry, revokedAt; logout revokes current session |

Represent the pickup branch as a field on the vehicle initially; branch CRUD is not assigned. Return the provider's legal name/registered address/telephone as the base provider information unless a separate trading-name requirement emerges. Company signup must also collect authentication credentials, although the Dobby paragraph lists only company/application fields; confirm this default in D-13.

Store money in integer minor units with a recorded currency and pricing unit once agreed. Calculate totals on the server. Keep booked vehicle/model/branch/rate snapshots so later listing edits do not silently rewrite the terms of existing bookings; current customer name/contact can be resolved from the referenced customer. Customer contact belongs in authorized company booking responses, not public vehicle listings.

A global database unique index must enforce VIN uniqueness, including inactive vehicles; map duplicate-key errors to a clear conflict response. Application pre-checks alone are insufficient. Normalize VIN consistently without silently introducing a jurisdiction-specific format rule. Use a unique normalized login email index. The user selected unique business registration numbers as a project rule. Required format remains to be agreed; this is not a claim about legal validation.

## Selected separate company signup

Use a separate company-signup operation rather than converting a customer. For example, `POST /auth/register` creates a customer, while `POST /auth/register-company` accepts credentials plus company details/document links and atomically creates a company-role account and pending provider. Both use the same Users collection, password handling, and `POST /auth/login`; separate signup does not require separate authentication systems or databases. These route names are now fixed in contracts/openapi.json, under /api/v1.

Keep `role = company` separate from `provider.status = pending/approved/rejected/suspended`. Pending status must not grant customer-booking privileges. After approval the role stays company and only provider status changes. Separate signup and no customer-to-company conversion are accepted. One representative per provider is the scoped engineering default selected after example review; no multi-representative management is added.

A conversion flow introduces questions about existing customer bookings, customer history, rights during review/rejection, and role reversal. Those costs add little value when the selected representative role cannot book. Use dedicated signup unless the team has an explicit need to convert existing customers.

## Company profile review and operational status

Preserve each submitted profile as a separate ProviderApplication version. Review states are `pending`, `approved`, and `rejected`; rejection requires a reason. Store submitted data as a snapshot, not an overwritten draft. Provider operational eligibility and application review are separate: an approved company submitting a pending revision must retain its current approved profile and eligibility unless suspended.

On approval, atomically update the latest-approved-profile reference. Rejection of a revision leaves the old approved profile unchanged. A company with no approved version cannot register vehicles or receive bookings. Suspension is independent: approving a profile revision must never reactivate a suspended company. Reactivation is an explicit admin action and does not restore cancellations.

Confirmed: at most one pending application per provider; submitted versions are immutable; resolve the pending application before a replacement submission and retain all historical versions. Pending/rejected companies can log in and inspect their status/history. The user confirmed separate login email and company contact email; keep login credentials outside versioned profiles, and keep company ownership/registration identity stable unless a deliberate identity-change process is selected. One representative per company and immutable login email/company registration identity are scoped engineering defaults in technical-design.md.

Latest user instruction supersedes read-only access: suspended representatives cannot access protected company operations, including reads, profile submissions and vehicle deactivation. Deny these requests even with previously issued credentials. Authentication may report suspension without exposing protected company data; this is an implementation response, not a separate company read capability. Logout remains possible. Public unauthenticated discovery remains public, but provides no company-account privileges. Check operational status on every relevant request so old credentials do not preserve revoked permissions.

## Confirmed calendar and pricing rules

Use `YYYY-MM-DD` calendar dates in Asia/Bangkok. Both `startDate` and `dueDate` are occupied rental days; rental days = calendar-day difference + 1. Start and due on the same date is valid. A rental from the 1st through the 5th occupies all five days; the vehicle is available again on the 6th. Do not compute calendar-day counts by mixing server-local and UTC timestamps.

Two non-cancelled bookings overlap when `existing.startDate <= requested.dueDate` and `existing.dueDate >= requested.startDate`; exclude the current booking during a date edit. One customer may rent different vehicles over the same dates. The user accepted an explicit window: required availableFrom and optional availableUntil (null means no planned end). A booking must fit entirely within that inclusive window. Reject window changes that exclude existing upcoming/ongoing bookings; never cancel them implicitly. Booking starting today is allowed; past starts are rejected. Maximum rental duration is 30 inclusive days, not a 30-day advance-booking horizon.

Companies can change rates, but already-booked rates remain fixed. THB and no additional fees are confirmed. Daily pricing and keeping the original rate when editing dates are confirmed. Recalculate the total for the new duration; no payment integration is included. Keep integer satang and server-calculated totals.

## Booking and concurrency rules

One specific vehicle per booking is confirmed. Customers choose a provider and a vehicle belonging to that provider. At create/edit time validate ownership, current provider approval, vehicle activation, rental dates, cap, and interval availability. Date edits retain the same vehicle, provider, and owner. Company users gain read access to their own vehicle bookings; the additions do not grant them edit/cancel powers over customer bookings.

The clarified cap is three advance bookings per user. Cancelled and completed bookings do not count. This supersedes the earlier proposal to count completed records. Completion is automatic on the day after dueDate in Asia/Bangkok, without a manual return operation. Ongoing rentals count until dueDate has passed. Centralize the predicate and test cancellation, completion, deletion, edits, and concurrent requests. Repeating a cancellation must not release a second slot. Derive effective completion from the inclusive dueDate on reads/counts rather than requiring a scheduler solely to free slots.

Use MongoDB transactions for coupled provider suspension/cancellation and booking state changes. **A transaction containing only a count/read followed by a booking insert does not by itself prevent write skew.** Have all cap-changing transactions update a shared per-user guard/counter document, and all booking creation/rescheduling and suspension transactions update the same provider guard/revision document before their validation/write. This serializes conflicting changes; use a consistent write order and bounded transaction retries. Same-vehicle overlaps are forbidden; similarly serialize competing changes through the vehicle document. Work out and test the exact mechanism before implementing it.

Suspension should complete the provider status change and cancellation of all upcoming and ongoing non-cancelled bookings together for this course-sized dataset. The endpoint must report success only after both effects commit. Creation/rescheduling racing with suspension must either commit before the suspension and be included in cancellation if not completed, or fail/retry against the suspended state. Include cancelled-record treatment in any cap-counter updates. The user explicitly selected cancellation of ongoing rentals too. Completed and already-cancelled records retain their history.

The ordinary booking-delete operation cancels and preserves the record, per user choice. Confirmed: customers may edit dates or cancel only while today < startDate. Admins follow the same date-edit cutoff but can perform emergency cancellation of ongoing bookings too. Completed bookings stay historical and cannot be cancelled as ongoing rentals. This preserves the accepted cutoff with the user’s sole admin exception. No cancelled-booking restoration. Vehicle deactivation preserves referenced records and existing bookings and blocks new bookings, per user choice. Latest user decision: vehicle descriptive updates allow pickup branch and price only; the remaining vehicle identity/specification fields are fixed. Approved companies may reactivate their own inactive vehicles. Bookings retain the pickup-branch snapshot from creation; later branch changes apply only to new bookings.

## Business documents and authentication

**Selected by user:** company representatives submit externally hosted document links. The backend stores one document URL in each submitted company profile; it does not upload, host, proxy, or store image/document binaries. Remove Multer, storage volumes, object storage, multipart parsing, and upload-cleanup flows from the proposed scope.

Proposed default: accept HTTPS URLs through JSON, validate syntax without server-side fetching, and let admins open the submitted links manually. Restrict link visibility to the submitting company and admins; external document sharing permissions are controlled by the submitter. One HTTPS link is selected; Google Drive is acceptable and no specific legal document category is required for this prototype. Replacing a document is part of a new profile version awaiting review. The user accepted company/admin-only URL visibility and manual review, but requested minimal complexity: store one syntactically valid HTTPS URL without host allowlists, fetching, document classification, or access-check infrastructure. Do not describe an externally shared document as private merely because its URL is restricted in this API.

**Selected after example review:** JWT Bearer using jsonwebtoken and bcryptjs, with an AuthSession record checked on every protected request and revoked on logout. This supersedes the opaque-session proposal. Default lifetime is 24 hours, multiple logins allowed, logout revokes the current session; no refresh tokens or cookie-auth dependency. See [technical-design.md](technical-design.md) for role handling, validation, module layout, concurrency and tests.

## Official technical references

Checked 2026-11-11 for the design capabilities below; these are engineering references, not assignment requirements or pinned package versions.

- [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/): multi-document atomic changes and their cost/limitations.
- [Mongoose transactions](https://mongoosejs.com/docs/transactions.html): transaction integration and session behavior. Do not parallelize operations within a single transaction.
