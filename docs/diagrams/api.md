# API map

The [OpenAPI JSON](../contracts/openapi.json) is the authoritative field/status contract. These are the implemented operations, grouped by access. Route paths share `/api/v1`.

```mermaid
flowchart LR
    Visitor[Visitor] --> Auth["POST /auth/register<br/>POST /auth/register-company<br/>POST /auth/login"]
    Account[Authenticated account] --> Session["GET /auth/me<br/>POST /auth/logout"]
    Company[Company representative] --> Own["GET /company/profile<br/>GET, POST /company/applications<br/>GET /company/applications/:applicationId"]
    Admin[Administrator] --> Review["GET /admin/providers<br/>GET /admin/providers/:providerId<br/>GET /admin/applications<br/>GET /admin/applications/:applicationId<br/>POST /admin/applications/:applicationId/review"]
    Admin --> Lifecycle["POST /admin/providers/:providerId/suspend<br/>POST /admin/providers/:providerId/reactivate"]
    Visitor --> Discovery["GET /providers and /vehicles<br/>GET provider/vehicle detail"]
    Company --> Vehicles["GET, POST /company/vehicles<br/>PATCH details, availability and activation"]
    Customer[Customer] --> Bookings["GET, POST /bookings<br/>GET, PATCH, DELETE booking detail"]
    Company --> CompanyBookings["GET /company/bookings<br/>GET booking detail"]
    Admin --> Bookings
    Vehicles --> Rentals[(Vehicle / Booking)]
    Bookings --> Rentals
    CompanyBookings --> Rentals
    Discovery --> Rentals
    Auth --> Users[(User / AuthSession)]
    Session --> Users
    Auth --> Providers[(Provider / ProviderApplication)]
    Own --> Providers
    Review --> Providers
    Lifecycle --> Providers
    Lifecycle --> Cancellation[Same-transaction booking cancellation]
```

Company protected reads/writes require a current non-suspended provider. Pending/rejected companies can read history and submit revisions but cannot manage vehicles. Logout permits a suspended account. B owns vehicle/booking operations; pending and rejected companies cannot use them.

This is an engineering API map. The instructor's UML Profile for API notation remains unconfirmed under D-07.
