# Internal service contract v1

This file freezes the integration boundary so A and B can implement separately. CommonJS named exports; all I/O functions return promises. Services return domain records/DTO-ready values, never Express response objects. Controller serializers produce exact OpenAPI DTOs. No private controller imports across modules.

## Shared context, modules and ownership

A creates `middleware/auth.js` with `protect`, `authorize(...roles)` and company-state policy. After protect:

```js
req.actor = {
  userId: '24-hex ID', role: 'user' /* or company/admin */,
  providerId: null /* or 24-hex ID */, sessionId: 'UUID'
};
```

Services accept `ctx = { actor: req.actor, clock }`; clock has `now(): Date`. Middleware identity does not substitute for transaction-time provider/record checks. Internal admin operations require actor.role admin as well as route middleware. Defaults can use the real shared clock; tests inject one. A owns `utils/ApiError.js` with `new ApiError(status, code, message)` and `middleware/error.js`; B throws this class, not bespoke response objects.

`utils/dates.js` (B) exports `todayBangkok(now)`, `validateDateOnly(value)`, `inclusiveDays(startDate,dueDate)`, `overlaps(aStart,aDue,bStart,bDue)` and `bookingStatus(booking,today)`. `utils/money.js` (B) exports `calculateTotal(ratePerDaySatang,rentalDays)`. All are pure; invalid input throws ApiError 400 VALIDATION_ERROR. No helper imports app/DB at module load.

A owns transaction infrastructure; B imports it. A's providers service may import B's booking-cancellation module. B's booking service may import Provider model and transaction helper, but never A's provider service. This avoids a circular dependency.

## Top-level service signatures

Return values below are persistence records unless DTO/summary is explicit. All IDs are normalized strings at the service boundary. List filters are already parsed/validated; services enforce allowed scopes again.

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

`Page<T> = {data:T[],count:number,pagination:{page,limit,total,pages}}`. Controllers wrap success true, serialize records, and do not nest Page inside data. Pure read operations derive the same today for a response; transactions capture now for each attempt.

## Transaction API — A infrastructure

`services/transactions.js` exports `runTransaction(work, {clock})`. It starts/ends a Mongoose session, uses supported retry semantics and calls `work({session,now,today})`; today is computed by the injected/shared calendar helper. Callback can be retried; no HTTP output or irreversible external effects inside. No parallel DB operations inside one transaction. Bound attempts to three and elapsed request budget to 2500 ms for transient retries; configure supported driver timeouts, test behavior, and return 409 WRITE_CONFLICT if a known uncommitted conflict exhausts the budget. A time budget cannot guarantee hard cancellation of a database operation; record actual timing. Never label an unknown commit outcome as safely failed/retryable: use the driver's commit-result handling and test it.

Also export:

```js
lockProvider(providerId, session) // $inc Provider.revision, return current record
lockUsers(userIds, session)      // sorted unique IDs; $inc bookingRevision
lockVehicles(vehicleIds, session) // sorted unique IDs; $inc revision
```

Always acquire provider -> users sorted by ID -> vehicles sorted by ID. No provider write after user locks should acquire a second provider. Each business transaction concerns one provider; cross-provider user cap conflicts through the same User guard. All cooperating write paths must follow this convention. Missing guard targets become scoped NOT_FOUND, not auto-created placeholders.

## Booking creation / edit / cancellation — B

1. Identify immutable provider/user/vehicle references (untrusted pre-reads only identify targets).
2. Begin transaction; lock provider, relevant users, relevant vehicles in order. Re-read records using session after guard acquisition. Validate references still agree, actor scope and provider/vehicle eligibility.
3. Apply state/cutoff then proposed-date/window rules. Count confirmed owner bookings dueDate >= today; exclude self on edit. Customer must have fewer than 3 on creation; edit must keep result <=3. Check inclusive same-vehicle overlap, excluding self.
4. Snapshot current vehicle/branch/rate only on creation. On edit keep old snapshots/rate, recompute duration/total. On cancel preserve records and stamp actor/reason/time once. Commit before serializing response.

Book starting today becomes ongoing immediately and cannot be customer-cancelled or date-edited under the pre-start rule. Make this explicit in tests. Already cancelled repeat is 200 with no new effects after authorization. Do not count cancellations as negative persisted counters.

## Suspension boundary — A orchestrates, B supplies cancellation

B owns a narrow `services/bookingCancellation.js` export:

```js
cancelNonCompletedForProvider({ providerId, actorId, today, now, session })
// -> { cancelledBookingCount: number }
```

Precondition: caller already owns the provider guard in the same active transaction. This function queries confirmed records for provider with dueDate >= today, then locks affected users in sorted order and affected vehicles in sorted order using shared helpers. Re-read/update the scoped set in that session. Set state cancelled, reason provider_suspended, cancelledBy actorId and cancelledAt now. Return actual modified count. No top-level transaction, HTTP response, provider-state change or external effect inside this function.

A's `suspendProvider` authorizes admin, opens the top-level transaction, locks approved provider, sets suspended/reason/time, calls the B operation with same session, and returns only after commit. Completed/cancelled history untouched. Repeated suspend -> INVALID_STATE before cancellation. If the B function fails, provider status and cancellations must both roll back.

Creating/editing/cancelling a booking and listing changes all take the provider guard, so racing writes either precede suspension and are cancelled, or retry against suspended status. Never use an independent bulk cancellation outside the transaction. Test real interleavings.

## Application review and vehicle mutations

A locks provider when allocating a version, submitting, reviewing, suspending or reactivating. Submission increments applicationSequence and sets latestApplicationId. Unique partial pending index protects the final invariant. Review checks pending status with a compare-and-set, writes reviewer/reason/time and switches approved pointer atomically. Do not clear suspension on approval. Profile revision cannot mutate representative login identity/registration number.

B takes provider then vehicle guard on branch/rate/window/activation writes, rechecks approved ownership and applies field allowlist. Window edits validate all confirmed upcoming/ongoing bookings remain inside. Activation does not cancel records. Creation takes provider guard plus the unique VIN index; no vehicle guard exists before insertion. Booking creation and listing edits therefore see a coherent branch/rate/window state.

## Starting independently

Until A's infrastructure lands, B may write pure rules/tests/models against these signatures and use test-only fake actor/transaction adapters. Until B's cancellation lands, A may test rollback/orchestration with a test-only injected cancellation function. Production code must import the real implementation and fail explicitly if a dependency is absent; do not ship silent no-op stubs. Real integration/race acceptance cannot pass on a fake adapter.
