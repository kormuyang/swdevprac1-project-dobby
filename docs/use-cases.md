# Use cases

These use cases cover the integrated A/B API. Endpoint names and fields follow the [OpenAPI contract](contracts/openapi.json).

## Visitor and account holder

- A visitor registers a customer or a provider representative. Public signup assigns the role and creates the first provider application for a representative.
- An account holder logs in and receives a separate 24-hour session.
- An authenticated account holder reads their own account and logs out of the current session. Other sessions remain active.
- A suspended representative cannot log in or use protected provider data. The representative can log out.

## Provider representative

- A representative reads their own provider profile and application history.
- A representative submits a profile as a new application version. Submitted profile fields remain fixed.
- A representative checks the outcome and history of submitted versions. A pending or rejected revision leaves the last approved profile active.

## Administrator

- An administrator reads provider and application records.
- An administrator approves a pending application or rejects it with a reason. Approval switches the approved profile; rejection retains the existing approved profile.
- An administrator suspends an approved provider with a reason. Suspension and cancellation of non-completed bookings share the transaction boundary.
- An administrator reactivates a suspended provider with a resolution note. Reactivation restores provider eligibility, not cancelled bookings.

## Customer

- A visitor browses approved providers and active vehicle listings, optionally for rental dates.
- A customer books a specific eligible vehicle for 1–30 inclusive Thailand days, within the three-booking cap.
- A customer reads only their own bookings, edits dates before the original start while retaining the agreed rate, or cancels before start.
- Cancellation keeps history and frees dates; completion is derived after the due date.

## Approved provider vehicle operations

- The provider creates and reads its vehicles, changes branch/rate, offering period and activation.
- Existing booking snapshots remain fixed. Window changes must retain upcoming/ongoing bookings.
- The provider reads own-vehicle booking history with current customer contact; it cannot edit or cancel bookings.

## Administrator booking operations

- The admin reads bookings across providers and edits dates under the same pre-start cutoff.
- The admin can cancel ongoing rentals in an emergency. Completed bookings stay historical.
- Concurrent booking and suspension operations preserve the cap, availability and atomic cancellation rules.

## API entry points

- Authentication: `POST /auth/register`, `POST /auth/register-provider`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- Provider applications: `GET /provider/profile`, `GET /provider/applications`, `POST /provider/applications`, and `GET /provider/applications/{applicationId}`.
- Admin review: `GET /admin/providers`, `GET /admin/providers/{providerId}`, `GET /admin/applications`, `GET /admin/applications/{applicationId}`, and `POST /admin/applications/{applicationId}/review`.
- Provider lifecycle: `POST /admin/providers/{providerId}/suspend` and `POST /admin/providers/{providerId}/reactivate`.

## Diagram notation

See the [use case diagrams](use-case-diagrams.md), [REST UML profile](api-diagram.md) and [sequence diagrams](sequence-diagrams.md) for the submission views and editable Mermaid/SVG pairs. The REST profile follows the supplied Chapter 6 slide 32 example (D-59); final delivery review remains separate.
