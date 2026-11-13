# A use cases

These use cases cover A01 authentication, A02 company applications, and A03 provider lifecycle. B-owned vehicle and booking flows are not included. Endpoint names and fields follow the [OpenAPI contract](contracts/openapi.json).

## Visitor and account holder

- A visitor registers a customer or a company representative. Public signup assigns the role and creates the first company application for a representative.
- An account holder logs in and receives a separate 24-hour session.
- An authenticated account holder reads their own account and logs out of the current session. Other sessions remain active.
- A suspended representative cannot log in or use protected company data. The representative can log out.

## Company representative

- A representative reads their own provider profile and application history.
- A representative submits a profile as a new application version. Submitted profile fields remain fixed.
- A representative checks the outcome and history of submitted versions. A pending or rejected revision leaves the last approved profile active.

## Administrator

- An administrator reads provider and application records.
- An administrator approves a pending application or rejects it with a reason. Approval switches the approved profile; rejection retains the existing approved profile.
- An administrator suspends an approved provider with a reason. Suspension and cancellation of non-completed bookings share the transaction boundary.
- An administrator reactivates a suspended provider with a resolution note. Reactivation restores provider eligibility, not cancelled bookings.

## API entry points

- Authentication: `POST /auth/register`, `POST /auth/register-company`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- Company applications: `GET /company/profile`, `GET /company/applications`, `POST /company/applications`, and `GET /company/applications/{applicationId}`.
- Admin review: `GET /admin/providers`, `GET /admin/providers/{providerId}`, `GET /admin/applications`, `GET /admin/applications/{applicationId}`, and `POST /admin/applications/{applicationId}/review`.
- Provider lifecycle: `POST /admin/providers/{providerId}/suspend` and `POST /admin/providers/{providerId}/reactivate`.

## Diagram notation

The sequence diagrams are Mermaid engineering diagrams. They do not claim to use the instructor's UML Profile for API. D-07 remains open until the required notation is confirmed.

See the [implemented A API map](diagrams/a-api.md) for access and endpoint groups.
