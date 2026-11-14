# A02 company applications and review

A02 covers the company profile and application history endpoints plus admin application/provider reads and application review. Interfaces follow the [OpenAPI contract](../contracts/openapi.json). Application profile fields are immutable after submission; review fields change once.

## Submit and review

```mermaid
sequenceDiagram
    actor Company
    participant Route as Company route
    participant Controller as Provider controller
    participant DB as MongoDB
    Company->>Route: POST /company/applications
    Route->>Route: Authenticate, authorize, validate profile
    Route->>Controller: Allowlisted profile
    Controller->>DB: Begin transaction and increment provider revision guard
    Controller->>DB: Check scoped provider and pending application
    Controller->>DB: Insert next immutable version
    Controller->>DB: Set latest application pointer and sequence
    Controller->>DB: Commit
    Controller-->>Company: 201 application version
    actor Admin
    Admin->>Route: POST /admin/applications/{id}/review
    Route->>Route: Authenticate, authorize, validate decision
    Route->>Controller: Application ID and decision
    Controller->>DB: Begin transaction and increment provider revision guard
    Controller->>DB: Compare-and-set pending application status
    alt Approved
        Controller->>DB: Switch approved pointer; preserve suspended status
    else Rejected
        Controller->>DB: Keep previous approved pointer
    end
    Controller->>DB: Commit
    Controller-->>Admin: Reviewed application
```

## Reads and privacy

- Company history and individual reads are scoped to the authenticated provider.
- Admin reads may include profile documents; public discovery uses a separate safe serializer.
- Provider private responses resolve the approved application pointer, so pending or rejected revisions do not replace the active profile.
- Company routes reject suspended accounts through authentication middleware. Admin review may proceed while suspended; approval leaves operational status suspended.

## Verification limits

Local tests cover validation, allowlists, normalization and serialization. The integration test uses only `TEST_MONGO_URI` naming `dobby_test_a`, initializes indexes, and checks role denial, concurrent submission, persisted version pointers and approval during suspension. A database run is required to confirm transaction behavior.
