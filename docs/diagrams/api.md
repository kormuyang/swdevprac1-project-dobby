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

## Route files

```mermaid
flowchart LR
    Server[server.js] --> AuthRoutes[auth.js at /api/v1/auth]
    Server --> ProviderRoutes[providers.js at /api/v1]
    Server --> VehicleRoutes[vehicles.js at /api/v1]
    Server --> BookingRoutes[bookings.js at /api/v1]
```

Each file groups methods by path with router.route() chains. Authentication and roles attach only to protected route chains; public discovery remains accessible when the resource routers share a mount prefix (D-53).

## Request flow

```mermaid
flowchart LR
    Request --> JSON[Global express.json]
    JSON --> Auth[Authentication and roles]
    JSON -->|Malformed or oversized| Error[Safe JSON error handler]
    Auth --> Approval[Provider approval where required]
    Approval --> Validation[Request validation middleware]
    Validation --> Controller
    Controller --> Logic[Feature logic]
    Validation -->|Invalid input| Error
    Logic -->|Failure| Error
    Logic -->|Simple scoped reads| Models
    Logic -->|Discovery or transactional writes| Service[Feature service]
    Service --> Models
    Controller --> Output[Allowlisted response]
```

Booking list/detail and provider vehicle reads live in controllers. Booking creation/date edits and the separate cancellation flow remain in services with provider → user → vehicle transaction guards. JSON parsing uses the Express default 100 KB limit and runs before route authentication (D-46). The shared JSON error handler returns 400 for malformed JSON, 413 for oversized bodies and a safe generic 500 for unexpected failures (D-54).

Provider protected reads/writes require a current non-suspended provider. Pending/rejected providers can read history and submit revisions but cannot manage vehicles. Logout permits a suspended account. B owns vehicle/booking operations; pending and rejected providers cannot use them.

This is an engineering API map. The instructor's UML Profile for API notation remains unconfirmed under D-07.
