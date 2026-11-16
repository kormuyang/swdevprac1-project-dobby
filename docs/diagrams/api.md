# API map

The [OpenAPI JSON](../contracts/openapi.json) is the authoritative field/status contract. These are the implemented operations, grouped by access. Route paths share `/api/v1`.

```mermaid
flowchart LR
    Visitor[Visitor] --> Auth["POST /auth/register<br/>POST /auth/register-provider<br/>POST /auth/login"]
    Account[Authenticated account] --> Session["GET /auth/me<br/>POST /auth/logout"]
    Provider[Provider representative] --> Own["GET /provider/profile<br/>GET, POST /provider/applications<br/>GET /provider/applications/:applicationId"]
    Admin[Administrator] --> Review["GET /admin/providers<br/>GET /admin/providers/:providerId<br/>GET /admin/applications<br/>GET /admin/applications/:applicationId<br/>POST /admin/applications/:applicationId/review"]
    Admin --> Lifecycle["POST /admin/providers/:providerId/suspend<br/>POST /admin/providers/:providerId/reactivate"]
    Visitor --> Discovery["GET /providers and /vehicles<br/>GET provider/vehicle detail"]
    Provider --> Vehicles["GET, POST /provider/vehicles<br/>PATCH details, availability and activation"]
    Customer[Customer] --> Bookings["GET, POST /bookings<br/>GET, PATCH, DELETE booking detail"]
    Provider --> ProviderBookings["GET /provider/bookings<br/>GET booking detail"]
    Admin -->|Read, date-edit, cancel| Bookings
    Vehicles --> Rentals[(Vehicle / Booking)]
    Bookings --> Rentals
    ProviderBookings --> Rentals
    Discovery --> Rentals
    Auth --> Users[(User / AuthSession)]
    Session --> Users
    Auth --> Providers[(Provider / ProviderApplication)]
    Own --> Providers
    Review --> Providers
    Lifecycle --> Providers
    Lifecycle --> Cancellation[Same-transaction booking cancellation]
```

## Request flow

```mermaid
flowchart LR
    Request --> JSON[Global express.json]
    JSON --> Auth[Authentication and roles]
    JSON -->|Malformed or oversized| Error[Express default HTML error]
    Auth --> Controller
    Controller --> Validation[Direct request validation]
    Validation --> Logic[Feature logic]
    Logic -->|Simple scoped reads| Models
    Logic -->|Discovery or transactional writes| Service[Feature service]
    Service --> Models
    Controller --> Output[Allowlisted response]
```

Booking list/detail and provider vehicle reads live in controllers. Booking creation/date edits and the separate cancellation flow remain in services with provider → user → vehicle transaction guards. JSON parsing uses the Express default 100 KB limit and runs before route authentication (D-46). Parser failures use Express defaults: malformed JSON returns 400, oversized JSON returns 413, with HTML error bodies (D-49).

Provider protected reads/writes require a current non-suspended provider. Pending/rejected providers can read history and submit revisions but cannot manage vehicles. Logout permits a suspended account. B owns vehicle/booking operations; pending and rejected providers cannot use them.

This is an engineering API map. The instructor's UML Profile for API notation remains unconfirmed under D-07.
