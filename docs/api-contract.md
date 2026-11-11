# HTTP contract v1

The machine-readable source is [contracts/openapi.json](contracts/openapi.json). [api-endpoints.md](api-endpoints.md) is its generated inventory. Base URL for local work: http://localhost:5003/api/v1. The server/collection are implementation deliverables, not already running services.

## Authority and compatibility

OpenAPI owns endpoint names, inputs and response shapes. This document adds cross-endpoint policies that schema tooling cannot express. Persistence belongs to data-model.md and atomic behavior to service-contracts.md. Change all affected contracts in the same reviewed change. Original assignment statements remain unchanged in requirements.md; named defaults here are engineering decisions under user delegation.

Serve this exact JSON through Swagger UI rather than maintaining a second annotation-derived spec. Postman collection requests are imported/generated from it, then augmented with acceptance assertions. When the spec changes, review/reapply scripts rather than overwriting their assertions. No hosted Postman workspace or publication is required.

## Parsing and responses

Requests are JSON; body limit 16 KiB. Reject unknown body and query fields, mixed scalar/array/operator types and malformed identifiers. Dates YYYY-MM-DD must represent real calendar dates. Normalize strings only as specified; never coerce object/array payloads into strings. IDs are 24 hex characters. All monetary fields ending Satang are safe integer satang, not decimal baht.

Success is `{success:true,data:...}`; list adds count (returned rows) and pagination `{page,limit,total,pages}`. Defaults page 1/limit 25, max 100; pages is ceil(total/limit), zero when no matches. A page past the end returns empty data with correct filtered total. Default order createdAt descending then id descending; applications use version descending for owner history and submittedAt ascending/id ascending for admin queue. Never expose arbitrary database projection/populate.

Errors are `{success:false,code,message}` with stable code and non-sensitive message. Do not return stacks, SQL/Mongo diagnostics, connection strings, raw queries or token material. Auth uses Bearer token only; no cookie fallback.

## Error precedence and codes

For protected operations: authenticate -> role -> current provider state -> request syntax/unknown-field validation -> scope/resource lookup -> resource state/cutoff -> proposed date/window/eligibility -> cap -> overlap -> write. Transaction-sensitive checks repeat after acquiring guards; middleware is not the final business authorization. A unique-index conflict can occur at write and is translated consistently.

| Status | Codes |
| --- | --- |
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHENTICATED |
| 403 | FORBIDDEN, PROVIDER_SUSPENDED, PROVIDER_NOT_APPROVED |
| 404 | NOT_FOUND (also another owner's private resource) |
| 409 | EMAIL_TAKEN, REGISTRATION_NUMBER_TAKEN, VIN_TAKEN, PENDING_APPLICATION_EXISTS, INVALID_STATE, BOOKING_LIMIT_REACHED, VEHICLE_UNAVAILABLE, BOOKING_OVERLAP, BOOKING_LOCKED, WINDOW_CONFLICT, WRITE_CONFLICT |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_ERROR |

Use PROVIDER_NOT_APPROVED for company management without approval. A customer's attempt to book a no-longer-eligible listing is 409 VEHICLE_UNAVAILABLE, not a disclosure of private application state. Inactive/suspended/nonpublic public detail returns 404. Missing referenced private ID outside scope never confirms its existence.

Health/Swagger are public. Invalid login credentials -> 401 with one generic message; valid suspended representative -> 403 PROVIDER_SUSPENDED. Protected company endpoints deny suspended tokens. POST logout deliberately bypasses provider-state restriction but still requires a valid session and returns no company information. Token reuse after successful logout -> 401.

## Resource policies

- Customers create and read own bookings; admin reads globally but cannot create. Customer-supplied userId/providerId/rates/status/totals/role are rejected.
- Date PATCH requires both startDate and dueDate, retains vehicle/provider/owner/snapshot/rate, and requires today < old startDate for both customer/admin. New start >= today is allowed; it can therefore become ongoing immediately. Recheck the entire interval, 1–30 days and cap/overlap excluding self.
- DELETE booking is cancellation. Customer requires pre-start; admin may emergency-cancel ongoing. Already-cancelled authorized records return 200 current record with no further effect; completed records return 409 BOOKING_LOCKED. No restore endpoint.
- Company booking endpoints are approved-only reads with customer name/email/telephone and booked vehicle/branch/dates/price. All history statuses supported. Company cannot mutate bookings.
- Public discovery includes approved providers, active vehicles and safe fields. Without requested dates, vehicles with an expired availableUntil are hidden, but a future availableFrom does not hide an advance listing. With dates, require both dates and apply full-window/overlap filtering. Availability does not hold a vehicle; create performs atomic revalidation.
- Customer booking list cannot supply userId/providerId admin filters. Company scope is trusted actor providerId; other-company vehicle filter is 404. Admin list may filter provider/user/status.
- Vehicle descriptive PATCH accepts only pickupBranch and/or ratePerDaySatang. Fixed VIN/model/brand/year/transmission/fuel/seats never change. Window/activation are separate operations. Branch/rate changes affect new snapshots only.
- Provider profile submission cannot alter login email or business registration identity. One pending version, immutable after submit. Review has exactly one decision: approve, or reject with nonempty reason. Repeat review -> 409 INVALID_STATE. Approving while suspended never reactivates.
- Suspend approved company only, with reason; cancel all confirmed records with dueDate >= today, including ongoing. Return exact committed cancelledBookingCount. Reactivate suspended only with resolution note and an approved profile; never restore cancelled bookings. Repeated lifecycle action -> 409 INVALID_STATE.

## Safety and defaults

API rate limit initial default 1000 requests / 10 minutes / IP; login/signup additionally 20 / 15 minutes / IP, adjustable through validated configuration for tests/demo. Use correct windowMs spelling. Log no payloads with passwords or document links. Helmet is retained; no browser client is assumed.

Registration number: trimmed case-preserving project ID (1..50), exact uniqueness, no inferred Thai legal checksum. VIN: trim/uppercase, 6..40 chars, exact uniqueness including inactive vehicles; no legal authenticity verification. Phone: trimmed string, 3..30 chars, not a numeric field. Document: one syntactically valid HTTPS URL, max 2048; no host allowlist/fetch/upload/preview. These are scope choices, not legal claims.

## Synthetic examples

At a frozen Thailand date of 2030-01-10, booking Jan 12–14 is three days. A booked daily rate of 100000 satang totals 300000 satang. If the company changes branch/rate, that booking retains its original branch and rate. Edit to Jan 13–16 before Jan 12 yields four days and 400000 satang. A second booking on the same vehicle starting Jan 16 overlaps; Jan 17 does not.

A cancellation of that booking before Jan 13 is allowed to its customer; during Jan 13–16 only admin emergency cancellation/suspension can cancel. After Jan 16 it is completed and excluded from the three-booking cap without any midnight job or manual return.
