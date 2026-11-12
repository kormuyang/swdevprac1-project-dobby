# Technical design

Use [OpenAPI](contracts/openapi.json) for endpoint names, inputs and response shapes. This file covers data, shared API rules and service functions. Update affected definitions together before changing the implementation.

## Contents

- [Application structure](#application-structure)
- [HTTP policies](#http-policies)
- [Persistence](#persistence)
- [Service interfaces and transactions](#service-interfaces-and-transactions)

## Application structure

Use Node 24/npm/CommonJS, Express 5, Mongoose 9 and Atlas. Supporting packages: dotenv, bcryptjs, jsonwebtoken, Helmet, express-rate-limit, swagger-ui-express and Newman. A00 verifies and pins compatible versions.

- `app.js` exports Express without connecting or listening.
- `server.js` validates configuration, waits for DB readiness, then listens.
- Use config/routes/controllers/services/models/middleware/utils, plus scripts/tests/postman. See [coding practices](../AGENTS.md#coding-practices) for responsibilities.

Local API: `http://localhost:5003/api/v1`. Swagger UI at `/api-docs` serves the committed JSON. Import it into the demo collection and add assertions; preserve scripts when regenerating requests. No hosted workspace, cookie auth, permissive CORS or overlapping sanitizer packages are needed.

## HTTP policies

### Input and responses

Accept JSON up to 16 KiB. Reject unknown body/query fields, wrong scalar/array/operator types and malformed IDs. IDs are 24 hex characters; dates must be real YYYY-MM-DD calendar dates. Normalize only the specified strings; do not turn objects/arrays into strings. `Satang` fields are safe integers.

Success: `{success:true,data:...}`. Lists also return count (rows on this page) and pagination `{page,limit,total,pages}`.

- Default page 1, limit 25; maximum limit 100.
- `pages = ceil(total/limit)`, or zero when there are no matches.
- A page beyond the end returns empty data with the correct filtered total.
- Default sort: createdAt descending, then id descending.
- Application history: version descending. Admin queue: submittedAt ascending, then id ascending.

Errors: `{success:false,code,message}`. Keep messages safe; do not return stacks, DB diagnostics, connection strings, raw queries or tokens. Clients cannot choose arbitrary projections or populate fields.

### Validation order

For protected requests:

```text
authentication → role → provider state → input validation → scoped lookup
→ record state/cutoff → proposed dates/window/eligibility → cap → overlap → write
```

Repeat transaction-sensitive checks after acquiring guards. A unique-index error at write time still needs a domain error.

| Status | Codes |
| --- | --- |
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHENTICATED |
| 403 | FORBIDDEN, PROVIDER_SUSPENDED, PROVIDER_NOT_APPROVED |
| 404 | NOT_FOUND (also another owner's private resource) |
| 409 | EMAIL_TAKEN, REGISTRATION_NUMBER_TAKEN, VIN_TAKEN, PENDING_APPLICATION_EXISTS, INVALID_STATE, BOOKING_LIMIT_REACHED, VEHICLE_UNAVAILABLE, BOOKING_OVERLAP, BOOKING_LOCKED, WINDOW_CONFLICT, WRITE_CONFLICT |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_ERROR |

Return 404 for another owner's private record, or a public detail request for an inactive vehicle, suspended provider or other hidden record. Unapproved company management returns PROVIDER_NOT_APPROVED. A customer booking an ineligible listing gets 409 VEHICLE_UNAVAILABLE without private application details.

Health/Swagger are public. Authentication is Bearer only. Wrong login credentials get one generic 401 message; valid suspended accounts get 403 PROVIDER_SUSPENDED. Logout requires a valid session but bypasses the company-state check and returns no company data. Reusing its token then returns 401.

### Access and discovery

Scope customer bookings by actor userId. Admin reads are global; companies read only own-vehicle bookings across all statuses. Company responses include current customer name/email/telephone and booked details. A company filter for another company's vehicle returns 404. Customer lists cannot accept userId/providerId filters; admin lists may filter provider/user/status.

Company signup creates User, Provider and the first application in one transaction. Pending/rejected companies can read their application history. Suspended companies cannot use protected reads/writes or submit profiles; logout is the exception.

Public discovery returns approved providers and active vehicles, with no private bookings, applications, customer information or document links.

- Without rental dates, hide expired availableUntil but keep future availableFrom listings.
- With rental dates, require both dates and filter by the full offering period and overlap rules.
- Search does not reserve a vehicle; booking creation checks again.

### Defaults and normalization

Use Helmet. Rate limits per IP: 1000 API requests per 10 minutes, plus 20 login/signup requests per 15 minutes. Use `windowMs`; limits can be adjusted through validated test/demo configuration. Never log password/document payloads.

Trim registration numbers without changing case. Trim/uppercase VINs; uniqueness includes inactive vehicles. Phone numbers are strings. Document links must be valid HTTPS URLs and visible only to owner/admin. Do not fetch, preview, classify or host them. The submitter controls external sharing permissions; we make no legal authenticity checks.

## Persistence

All collections use timestamps and ObjectId references. A owns User/Provider/ProviderApplication/AuthSession; B owns Vehicle/Booking.

### Values and limits

- Roles: user/company/admin; user means customer. Signup sets the role; admins are seeded.
- Dates: validated YYYY-MM-DD strings, Asia/Bangkok, inclusive, 1–30 days. Duration is UTC calendar ordinal(dueDate) - ordinal(startDate) + 1. Event timestamps are Date instants.
- Money: integer satang, currency THB; rate 1..1,000,000,000 and total 1..30,000,000,000.
- Trim strings. Maximum lengths: name 120, legalName 200, address 500, branch name/address 120/500, email 254, model 120, optional brand 80, document URL 2048.
- Other lengths: telephone 3..30, registration number 1..50, VIN 6..40, reasons/notes 1..1000. No legal ID checksum checks.
- Password: 8–72 UTF-8 bytes. Optional model year: integer 1900..2100. Seats: integer 1..20.
- Transmission: automatic/manual. Fuel: petrol/diesel/hybrid/electric/other.

### User — A

`name`, `telephone`, `email` (normalized unique login), `passwordHash` (select false), `role`, `providerId` (company only, null otherwise), `bookingRevision` (integer, default 0).

Login email is immutable. There is no identity-change, account-delete or password-recovery API. Keep User.providerId and Provider.representativeId consistent after atomic company signup. `bookingRevision` is a guard, not a booking count. Hash with bcryptjs, 10 rounds; see the [save-hook rules](../AGENTS.md#coding-practices).

Indexes: unique `{email:1}` named `uq_user_email`; partial unique `{providerId:1}` with providerId type ObjectId named `uq_user_provider`. Ensure role/provider consistency in service validation; never unique-index nullable providerId without a filter.

### Provider — A

`representativeId` (User), `businessRegistrationNumber` (trimmed immutable), `status` enum pending/rejected/approved/suspended, `approvedApplicationId` nullable, `latestApplicationId`, `applicationSequence` integer, `revision` integer default 0, `suspensionReason` nullable, `suspendedAt` nullable, `suspendedBy` nullable User, `reactivationNote` nullable, `reactivatedAt` nullable, `reactivatedBy` nullable User.

Keep operational status separate from application review:

- First submission → pending; rejection without an approved profile → rejected; resubmission → pending.
- Approval → approved unless already suspended.
- A pending/rejected revision leaves an approved provider's status unchanged.
- Admin may finish a review during suspension, but approval cannot reactivate the provider.
- Reactivation needs suspended state and an approved profile; cancelled bookings and revoked sessions stay unchanged.

Public name/address/telephone come from the approved profile's legalName/registeredAddress/telephone. Lifecycle fields keep the latest suspension/reactivation only; full event history remains an [open decision](decisions.md#open-decisions).

Indexes: unique registration number (`uq_provider_registration`), unique representativeId (`uq_provider_representative`), `{status:1,createdAt:-1,_id:-1}`.

### ProviderApplication — A

`providerId`, `version` positive sequence, `businessRegistrationNumber` immutable copy, `profile` embedded `{legalName,registeredAddress,telephone,contactEmail,documentUrl}`, `status` pending/approved/rejected, `rejectionReason` nullable, `reviewedBy` nullable, `submittedAt`, `reviewedAt` nullable.

Read the approved profile through approvedApplicationId. Submitted fields are fixed; review changes status/reviewer/reason/time only. Review requires pending status and either approval or rejection with a nonempty reason; repeating it returns 409 INVALID_STATE.

The server copies registration identity. Change company contact email through a new profile version; it need not be unique. Allocate versions under the provider guard.

Indexes: unique `{providerId:1,version:1}` (`uq_application_version`); unique `{providerId:1}` partial `{status:'pending'}` (`uq_application_pending`); `{status:1,submittedAt:1,_id:1}`. Sequence allocation and new submission use the provider transaction guard.

### AuthSession — A

`sid` random UUID/string, `userId`, `expiresAt`, `revokedAt` nullable.

Protect verifies JWT signature, HS256 and expiry, then requires an existing user and matching unrevoked/unexpired session. Read current role/provider state from DB. Claims: sub=userId, sid, iat, exp. Sessions last 24 hours, with multiple logins allowed. Store no raw JWT. Issuer/audience are not set; if added, signing and verification must agree.

Indexes: unique sid (`uq_session_sid`), optional expiresAt TTL 0, `{userId:1,revokedAt:1}`. Enforce expiry in middleware regardless of TTL cleanup. Logout updates revokedAt and does not require approved provider state.

### Vehicle — B

`providerId` immutable; `vin` uppercase immutable globally unique; optional brand/modelYear; model/transmissionType/fuelType/seatingCapacity immutable; `pickupBranch` embedded `{name,address}`; `ratePerDaySatang`; `availableFrom`; `availableUntil` nullable default null; `isActive` default true; `revision` default 0.

Descriptive PATCH accepts pickupBranch and/or ratePerDaySatang. Window and activation are separate operations. Keep fixed identity/specification fields unchanged.

Require availableFrom <= availableUntil when an end exists. Do not require an old window start to be >= today on later edits; the booking start must be >= today. Window edits must retain every upcoming/ongoing confirmed booking. Branch changes leave booked snapshots unchanged.

Indexes: global unique `{vin:1}` (`uq_vehicle_vin`); `{providerId:1,isActive:1,createdAt:-1,_id:-1}`; additional discovery indexes only after measurement. No hard-delete endpoint.

### Booking — B

Immutable refs `userId`, `providerId`, `vehicleId`; `startDate`, `dueDate`; `state` confirmed/cancelled; `vehicleSnapshot` embedded VIN/optional brand/year/model/transmission/fuel/seats/pickupBranch; `ratePerDaySatang` immutable; `rentalDays`, `totalPriceSatang`, currency THB; `cancelledAt`, `cancelledBy`, `cancellationReason` nullable. Reasons customer_cancelled/admin_cancelled/provider_suspended. cancelledBy is the triggering user/admin; suspension uses suspending admin ID.

Create the vehicle/branch/rate snapshot once. Date edits update dates/days/total only. Read current customer name/email/telephone for authorized responses; snapshots never contain passwords or document URLs.

Derive status:

- cancelled when state is cancelled.
- upcoming when startDate > today.
- ongoing when startDate <= today <= dueDate.
- completed when dueDate < today.

Count confirmed records with dueDate >= today for the owner. Same-vehicle overlap is `startDate <= request.dueDate && dueDate >= request.startDate`, using confirmed records and excluding self on edit. Also assert matching providerId. Completion needs no midnight job or manual return; different vehicles can overlap for one customer.

Indexes: `{userId:1,state:1,dueDate:1}` for cap; `{vehicleId:1,state:1,startDate:1,dueDate:1}` for overlap; `{providerId:1,state:1,dueDate:1}` for suspension; `{userId:1,createdAt:-1,_id:-1}` and `{providerId:1,createdAt:-1,_id:-1}` for scoped history. No unique interval index is claimed; the transaction protocol supplies exclusion.

### Indexes and output

Create collections/indexes in explicit bootstrap/seed before mutation tests. Do not sync/drop indexes on normal startup against an unspecified DB. Test uniqueness and select:false behavior, not just field declarations.

Serialize _id as id; hide __v, revisions, passwordHash, sid and raw claims. Select populated fields explicitly. Public provider fields are id/name/address/telephone; application history is owner/admin only. Password hashes stay hidden even after login uses select('+passwordHash').

## Service interfaces and transactions

Use CommonJS named exports. I/O functions return promises and records, not Express responses. Controllers serialize OpenAPI DTOs. No private controller imports across modules.

### Context and shared helpers

A provides `middleware/auth.js` with `protect`, `authorize(...roles)` and company-state checks:

```js
req.actor = {
  userId: '24-hex ID',
  role: 'user', // user/company/admin
  providerId: null, // company: 24-hex ID
  sessionId: 'UUID'
};
```

Services receive `ctx = { actor: req.actor, clock }`, where clock has `now(): Date`. Use a real shared clock by default and inject it for tests. Services must recheck scope/provider state inside transactions. Admin service calls also check actor.role, even with route middleware.

A owns `utils/ApiError.js`: `new ApiError(status, code, message)`, plus `middleware/error.js`. B uses the same class.

B provides pure helpers:

- utils/dates.js: `todayBangkok(now)`, `validateDateOnly(value)`, `inclusiveDays(startDate,dueDate)`, `overlaps(aStart,aDue,bStart,bDue)`, `bookingStatus(booking,today)`.
- utils/money.js: `calculateTotal(ratePerDaySatang,rentalDays)`.

Invalid helper input throws ApiError 400 VALIDATION_ERROR. Importing helpers must not load app/DB.

A's provider service can import B's bookingCancellation. B can import Provider and transaction helpers, but not A's provider service, to avoid a circular import.

### Service functions

IDs are normalized strings; list filters are parsed/validated. Services still enforce scope. Results are persistence records unless marked DTO/summary.

| Module / owner | Export | Result |
| --- | --- | --- |
| services/auth.js / A | registerCustomer(input, ctx), registerCompany(input, ctx), login(input, ctx) | `{user, token, expiresAt}`; ctx.actor absent for public auth |
| services/auth.js / A | logout(ctx), getMe(ctx) | `{message}` / safe User DTO |
| services/providers.js / A | getOwnProvider(ctx), listOwnApplications(filters,ctx), getOwnApplication(id,ctx), submitApplication(profile,ctx) | Provider / Page<Application> / Application / Application |
| services/providers.js / A | listAdminProviders(filters,ctx), getAdminProvider(id,ctx), listAdminApplications(filters,ctx), getAdminApplication(id,ctx), reviewApplication(id,input,ctx) | Page / Provider / Page / Application / Application |
| services/providers.js / A | suspendProvider(id,{reason},ctx), reactivateProvider(id,{resolutionNote},ctx) | `{provider,cancelledBookingCount}` / Provider |
| services/vehicles.js / B | listPublicProviders(filters,ctx), getPublicProvider(id,ctx), listPublicVehicles(filters,ctx), getPublicVehicle(id,ctx) | Page/public record (ctx.actor not needed) |
| services/vehicles.js / B | listOwnVehicles(filters,ctx), getOwnVehicle(id,ctx), createVehicle(input,ctx), updateVehicle(id,input,ctx), updateAvailability(id,input,ctx), setVehicleActivation(id,input,ctx) | Page/Vehicle |
| services/bookings.js / B | createBooking(input,ctx), updateBookingDates(id,input,ctx), cancelBooking(id,ctx), getBooking(id,ctx), listBookings(filters,ctx) | Booking/Page; user/admin scope only |
| services/bookings.js / B | listCompanyBookings(filters,ctx), getCompanyBooking(id,ctx) | Booking/Page; approved own provider only |

`Page<T> = {data:T[],count:number,pagination:{page,limit,total,pages}}`. Controllers add success:true without nesting Page inside data. Reads use one today value per response; transactions capture time per attempt.

### Transactions

A's services/transactions.js exports `runTransaction(work, {clock})`. It starts/ends a Mongoose session and calls `work({session,now,today})` using the shared calendar helper.

- Use the same session for all DB operations, without parallel calls.
- Retry transient failures at most three attempts within a 2500 ms request budget. Configure/test driver timeouts and record actual timing; the budget cannot forcibly cancel a DB call.
- Known uncommitted conflicts that exhaust retries return 409 WRITE_CONFLICT. Unknown commit outcomes need driver commit-result handling, not a claim that retrying is safe.
- The callback may repeat, so keep HTTP output and irreversible external effects outside it.

Also export:

```js
lockProvider(providerId, session) // $inc Provider.revision, return current record
lockUsers(userIds, session)      // sorted unique IDs; $inc bookingRevision
lockVehicles(vehicleIds, session) // sorted unique IDs; $inc revision
```

Lock in this order: provider → sorted users → sorted vehicles. Each transaction concerns one provider; never acquire another provider after user locks. The shared User guard protects the cap across providers. Missing guard targets return scoped NOT_FOUND, not placeholder records.

Note: counting inside a transaction alone can still allow competing inserts. All write paths need the shared guards and same-session rechecks.

### Booking writes — B

1. Identify fixed provider/user/vehicle references. Preliminary reads only identify targets; do not trust them for final validation.
2. Start the transaction, take guards in order, re-read records and check matching references, scope and provider/vehicle eligibility.
3. Check state/cutoff before proposed dates, then cap and overlap. Date PATCH needs both dates, new start >= today and the full rental inside the window. Count owner bookings excluding self on edit: fewer than three before creation, at most three after edit.
4. Creation snapshots current vehicle/branch/rate. Edits keep snapshots/rate and recalculate days/total. Cancellation retains the record and stamps actor/reason/time once. Commit before returning the response.

Customer cancellation and customer/admin date edits require today < old startDate. Admin may emergency-cancel ongoing rentals. A booking starting today is already ongoing; test that it cannot be customer-cancelled or date-edited.

DELETE means cancellation. Repeating an authorized cancellation returns 200 with no new effects. Completed cancellation returns 409 BOOKING_LOCKED. Cancelled records cannot be edited or restored; do not maintain negative cancellation counters.

### Suspension — A and B

B exports from services/bookingCancellation.js:

```js
cancelNonCompletedForProvider({ providerId, actorId, today, now, session })
// -> { cancelledBookingCount: number }
```

The caller must already hold the provider guard in that transaction. B queries confirmed provider bookings with dueDate >= today, locks sorted users then sorted vehicles, and re-reads/updates the scoped set. Set state cancelled, reason provider_suspended, cancelledBy actorId and cancelledAt now. Return the actual modified count.

This helper does not start a transaction, change provider state, respond to HTTP or trigger external effects.

A's suspendProvider checks admin, opens the transaction, locks the approved provider, sets suspended/reason/time and calls B with the same session. Return only after commit. If cancellation fails, roll back both changes. Leave completed/cancelled history unchanged.

Reactivation needs admin, suspended state, an approved profile and resolutionNote; restore eligibility only. Repeated lifecycle actions return INVALID_STATE. Booking/listing writes take the same provider guard, so they commit before suspension and are cancelled, or retry against suspended state. Test these races; do not cancel in a separate transaction.

### Application and vehicle writes

A locks Provider for version allocation, submission, review, suspension and reactivation. Submission increments applicationSequence and sets latestApplicationId. The partial unique index enforces one pending version. Review uses a pending-status compare-and-set, writes reviewer/reason/time and switches the approved pointer atomically without clearing suspension. Profile revisions cannot change login/registration identity.

B locks provider then vehicle for branch/rate/window/activation changes, rechecks approved ownership and applies the allowlist. Window edits retain confirmed upcoming/ongoing bookings; activation does not cancel them. Creation needs the provider guard and unique VIN index, with no vehicle guard before insertion. Booking and listing changes therefore use a consistent branch/rate/window state.
