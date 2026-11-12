# Persistence contract v1

This is the shared Mongoose design; the HTTP DTOs are in `contracts/openapi.json`. A owns User/Provider/ProviderApplication/AuthSession. B owns Vehicle/Booking. Add no field/enum rename without a contract change and partner review. All collections use timestamps; references are ObjectId, JSON IDs are strings named id. Disable/default-hide internal revisions and password hashes in all serializers.

## Common values and limits

- Roles: user/company/admin. User means customer.
- Date-only: validated YYYY-MM-DD, Asia/Bangkok; both boundaries inclusive, 1–30 days. Real event timestamps are Date instants.
- Money: integer satang, rate 1..1,000,000,000, total 1..30,000,000,000, currency THB. These are project bounds, not financial/legal rules.
- String trim and lengths: name 120, legalName 200, address 500, branch name 120/address 500, email 254, telephone 3..30, registration number 1..50, VIN 6..40, model 120, optional brand 80, reasons/notes 1..1000, document URL 2048. Do not apply legal ID checksum validation.
- Password input 8..72 UTF-8 bytes; never persist plaintext. Model year optional integer 1900..2100. Seats integer 1..20. Fixed enums: transmission automatic/manual; fuel petrol/diesel/hybrid/electric/other.

## User — A

`name`, `telephone`, `email` (normalized unique login), `passwordHash` (select false), `role`, `providerId` (company only, null otherwise), `bookingRevision` (integer, default 0).

> does this mean a user can only be 1 role at a time? does being admin or company preserve ability to booking like a user

Signup email immutable; no account identity-change/delete/password recovery API. Guard revision has no business count meaning. User.providerId and Provider.representativeId must agree after atomic company signup. Password hashing uses the isModified guard.

Indexes: unique `{email:1}` named `uq_user_email`; partial unique `{providerId:1}` with providerId type ObjectId named `uq_user_provider`. Ensure role/provider consistency in service validation; never unique-index nullable providerId without a filter.

## Provider — A

`representativeId` (User), `businessRegistrationNumber` (trimmed immutable), `status` enum pending/rejected/approved/suspended, `approvedApplicationId` nullable, `latestApplicationId`, `applicationSequence` integer, `revision` integer default 0, `suspensionReason` nullable, `suspendedAt` nullable, `suspendedBy` nullable User, `reactivationNote` nullable, `reactivatedAt` nullable, `reactivatedBy` nullable User.

> assuming we want simplicity, so we just keep only latest suspension, reactivation, application. did i understand correctly?

Indexes: unique registration number (`uq_provider_registration`), unique representativeId (`uq_provider_representative`), `{status:1,createdAt:-1,_id:-1}`.

First application pending -> provider pending. Reject first -> provider rejected; resubmit without approved profile -> pending. Approve any pending version -> approved unless already suspended. Submit/reject a revision when an approved profile exists leaves operational status unchanged. Suspended representative cannot submit/read; admin may finish review but never clear suspension through approval. Reactivate requires suspended plus non-null approved profile; no token or booking restoration implied.

Public name/address/telephone are projected from the approved application's legalName/registeredAddress/telephone, never the latest pending version.

## ProviderApplication — A

`providerId`, `version` positive sequence, `businessRegistrationNumber` immutable copy, `profile` embedded `{legalName,registeredAddress,telephone,contactEmail,documentUrl}`, `status` pending/approved/rejected, `rejectionReason` nullable, `reviewedBy` nullable, `submittedAt`, `reviewedAt` nullable.

Approved profile is read through approvedApplicationId. Submitted fields never change; review writes only status/reviewer/reason/time. Registration identity is copied by server; company contact email is independently editable through future profile versions. No uniqueness requirement on company contact email.

Indexes: unique `{providerId:1,version:1}` (`uq_application_version`); unique `{providerId:1}` partial `{status:'pending'}` (`uq_application_pending`); `{status:1,submittedAt:1,_id:1}`. Sequence allocation and new submission use the provider transaction guard.

## AuthSession — A

`sid` random UUID/string, `userId`, `expiresAt`, `revokedAt` nullable. JWT claims sub=userId, sid, iat, exp; sign HS256 and require that algorithm. 24-hour lifetime, multiple sessions. Do not persist raw token. Default issuer/audience are deliberately not introduced; if later enabled, sign and verify together.

Indexes: unique sid (`uq_session_sid`), optional expiresAt TTL 0, `{userId:1,revokedAt:1}`. Enforce expiry in middleware regardless of TTL cleanup. Logout updates revokedAt and does not require approved provider state.

## Vehicle — B

`providerId` immutable; `vin` uppercase immutable globally unique; optional brand/modelYear; model/transmissionType/fuelType/seatingCapacity immutable; `pickupBranch` embedded `{name,address}`; `ratePerDaySatang`; `availableFrom`; `availableUntil` nullable default null; `isActive` default true; `revision` default 0.

> what is `available` in this context? what if there are many users want to the same vehicle?

> another idea is to have a list of booking and booked date for a particular vehicle, so we can keep track of dates with available/unavailable. 

Company updates only branch and rate through descriptive PATCH. Separate activation and window operations. Window from <= until if end exists; do not force an old window start to be >= today on later edits. Booking validation imposes start >= today. End cannot exclude retained upcoming/ongoing bookings. Existing booking branch snapshot is preserved when current branch changes.

Indexes: global unique `{vin:1}` (`uq_vehicle_vin`); `{providerId:1,isActive:1,createdAt:-1,_id:-1}`; additional discovery indexes only after measurement. No hard-delete endpoint.

## Booking — B

Immutable refs `userId`, `providerId`, `vehicleId`; `startDate`, `dueDate`; `state` confirmed/cancelled; `vehicleSnapshot` embedded VIN/optional brand/year/model/transmission/fuel/seats/pickupBranch; `ratePerDaySatang` immutable; `rentalDays`, `totalPriceSatang`, currency THB; `cancelledAt`, `cancelledBy`, `cancellationReason` nullable. Reasons customer_cancelled/admin_cancelled/provider_suspended. cancelledBy is the triggering user/admin; suspension uses suspending admin ID.

Never store customer passwords or document URLs in snapshots. Read current customer name/email/telephone from User for authorized response. A snapshot is created once; date editing updates dates/days/total only. Price/branch changes never overwrite it.

Derived response status: cancelled if state cancelled; upcoming if startDate > today; ongoing if startDate <= today <= dueDate; completed if dueDate < today. Counted cap predicate: userId + state confirmed + dueDate >= today. Overlap predicate: vehicleId + state confirmed + startDate <= request.dueDate + dueDate >= request.startDate, excluding current ID for edit. Include the providerId assertion to prevent inconsistent refs.

Indexes: `{userId:1,state:1,dueDate:1}` for cap; `{vehicleId:1,state:1,startDate:1,dueDate:1}` for overlap; `{providerId:1,state:1,dueDate:1}` for suspension; `{userId:1,createdAt:-1,_id:-1}` and `{providerId:1,createdAt:-1,_id:-1}` for scoped history. No unique interval index is claimed; the transaction protocol supplies exclusion.

## Migrations and serialization

Create collections/indexes in explicit seed/bootstrap before mutation tests; verify duplicate index names map to HTTP codes. Do not sync/drop indexes against an unspecified DB on normal startup. Schema tests assert uniqueness and select:false behavior, not merely copied field declarations.

DTOs follow OpenAPI, serialize _id -> id, omit __v/revisions/passwordHash/sid/raw claims. Populate only needed refs; provider public DTO contains id/name/address/telephone. Application history is owner/admin only. User DTO never includes passwordHash even after login used select('+passwordHash').
