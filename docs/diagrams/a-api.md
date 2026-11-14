# A API map

The [OpenAPI JSON](../contracts/openapi.json) is the authoritative field/status contract. These are the implemented A operations, grouped by access. Route paths share `/api/v1`.

```mermaid
flowchart LR
    Visitor[Visitor] --> Auth["POST /auth/register<br/>POST /auth/register-company<br/>POST /auth/login"]
    Account[Authenticated account] --> Session["GET /auth/me<br/>POST /auth/logout"]
    Company[Company representative] --> Own["GET /company/profile<br/>GET, POST /company/applications<br/>GET /company/applications/:applicationId"]
    Admin[Administrator] --> Review["GET /admin/providers<br/>GET /admin/providers/:providerId<br/>GET /admin/applications<br/>GET /admin/applications/:applicationId<br/>POST /admin/applications/:applicationId/review"]
    Admin --> Lifecycle["POST /admin/providers/:providerId/suspend<br/>POST /admin/providers/:providerId/reactivate"]
    Auth --> Users[(User / AuthSession)]
    Session --> Users
    Auth --> Providers[(Provider / ProviderApplication)]
    Own --> Providers
    Review --> Providers
    Lifecycle --> Providers
    Lifecycle --> Cancellation[Same-transaction booking cancellation]
```

Company protected reads/writes require a current non-suspended provider. Pending/rejected companies can read history and submit revisions but cannot manage vehicles. Logout permits a suspended account. B owns the vehicle/booking endpoints and their remaining integration.

This is an engineering API map. The instructor's UML Profile for API notation remains unconfirmed under D-07.
