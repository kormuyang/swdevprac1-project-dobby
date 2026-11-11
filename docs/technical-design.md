# Selected technical design after course-example review

Selected 2026-11-11 under the user's authorization to decide missing technical practices. This is the selected technical direction; the finalized planning interfaces are now in contracts/openapi.json, api-contract.md, data-model.md and service-contracts.md. No Dobby backend has been implemented. See [example-review.md](example-review.md) for evidence and limitations. Original assignment requirements and user-selected domain rules remain separate.

## Runtime and application structure

Use Node.js 24, npm with committed package-lock, JavaScript/CommonJS, Express 5, Mongoose 9 and MongoDB Atlas. Node 24 matches the inspected environment and satisfies the example lockfile engine requirements. Verify the exact installed versions together during scaffolding; do not run blind major upgrades or imply the sample has been runtime-tested.

Retain familiar folders: `routes`, `controllers`, `models`, `middleware`, `config`. Add `services` for booking, application review and suspension; `utils` for date/money helpers; `tests`, `scripts` and `postman` for verification/setup artifacts. No repository abstraction, microservices, frontend, Redis, file storage or external business API is needed.

`app.js` assembles and exports Express without listening; `server.js` validates configuration, awaits MongoDB readiness, then listens. Central error middleware formats known errors; unexpected errors produce generic responses with safe server-side diagnostics. Never log tokens, passwords, document URLs or connection strings.

## Authentication and authorization

Select **JWT Bearer**, jsonwebtoken and bcryptjs to match the taught practice; this supersedes the earlier opaque-token proposal. Default token lifetime: 24 hours; simultaneous logins allowed; logout revokes the current session only. No refresh tokens, email verification, password recovery or account deletion workflow.

Each login creates an AuthSession with a random session ID (`sid`), user reference, expiry and revoked timestamp. Signed JWT contains user ID and sid; require the expected signing algorithm and expiry. Protect verifies signature, requires matching unrevoked unexpired session and an existing account, then reads current role/company state from MongoDB. TTL cleanup is optional housekeeping; expiry must be checked even before TTL deletion. No raw JWT needs storage. Use HS256 with a configured high-entropy JWT_SECRET. `POST /api/v1/auth/logout` revokes the presented session; login, logout and /me use the shared controller patterns from the course.

Code roles: `user` (customer), `company`, `admin`; human-facing documents may say customer. Separate signup endpoints assign user/company roles on the server; public clients cannot choose admin. Admin account is created by a controlled seed. Normalize login email, enforce a database unique index, keep login email separate from reviewed company contact email, and provision one representative account per provider as a scoped default. Account login email and company registration number are immutable in this project; no identity-change workflow is added. These defaults close remaining identity questions under the user's technical-choice authorization and may be revised explicitly.

Use bcryptjs with salt rounds 10 to match the example, password length 8–72 UTF-8 bytes, never expose the hash and only hash modified passwords. Validate strings before hashing/token operations. Company signup creates account/provider/first application atomically.

Suspended representatives cannot authenticate into protected company capabilities, read company data, submit applications or mutate listings. Existing tokens must fail company authorization immediately. Login may return a generic suspended denial and logout can still revoke a token; neither grants business access. Public discovery remains unauthenticated. Pending/rejected applicants can inspect their own application state/history; approval is required for vehicle management and company booking views.

## Validation, API conventions and middleware

Prefix `/api/v1`. Keep success responses `{ success: true, data, ... }`; lists include `count` and `pagination`. Errors use `{ success: false, code, message }`. Use 201 create, 200 read/update/cancel, 400 invalid input, 401 missing/invalid authentication, 403 forbidden role/company state, 404 missing/inaccessible private record, 409 state/uniqueness/booking conflicts, and 429 request limit. Treat business-cap and overlap conflicts consistently as 409.

Validate/allowlist input in small feature validation functions, backed by Mongoose constraints; no new general-purpose validation framework is needed initially. Never pass raw request bodies/queries to database operations. Allowlist filters/sort keys and projections, validate Mongo IDs/date-only values, reject invalid calendars and array/operator objects where strings are required, normalize unique fields, cap page size at 100 (default 25). Do not expose arbitrary select/populate.

Use Helmet, JSON body-size limits and express-rate-limit with documented `windowMs`. Configure separate login/signup limits and a broader API limit. Since this is backend/Postman only, omit browser-cookie auth, cookie-parser and permissive CORS configuration initially. Do not inherit hpp or generic XSS/Mongo sanitizers without a demonstrated need and compatibility check; typed/allowlisted query construction is the selected baseline. No server fetches user document URLs; accept one syntactically valid HTTPS URL with a practical length limit, keeping it out of public responses.

## Models and state rules

Use Users, Providers, ProviderApplications, Vehicles, Bookings and AuthSessions. Database unique indexes enforce normalized login email, stable company registration number, normalized VIN, provider+applicationVersion and session ID. At most one pending application per provider must be enforced atomically (for example a partial unique index on pending provider applications), not merely by a prior find. Provider and vehicle owner references never change through public payloads.

Store date-only domain values as validated `YYYY-MM-DD` strings. Interpret today in Asia/Bangkok using a single shared clock/helper. Compute inclusive calendar duration through a consistent UTC-based calendar ordinal after validation, not host-local timestamps. Keep actual event timestamps (createdAt, cancelledAt, reviewedAt) as instants. Freeze/inject the clock in boundary tests.

Vehicle update allowlist is **pickup branch and daily rate**; VIN/model/transmission/fuel/seats remain fixed. This supersedes the earlier price-only rule. Active/inactive and availability-window operations are separate agreed controls. Approved companies may reactivate their own vehicles. Availability-window changes cannot invalidate existing upcoming/ongoing bookings.

Preserve vehicle/model/branch/booked-rate snapshots on booking creation. Later branch/rate edits apply to new bookings, leaving prior booked terms unchanged. Date edits keep the same vehicle/provider/owner, branch snapshot and original rate; recalculate total only. Amounts are integer satang; rate is positive. Use optional brand/year alongside the assignment's required model/transmission/fuel/seats/VIN/branch/rate; no photos or separate branch-management system. Initial discovery filters cover provider, model/brand, transmission, fuel, seats, daily-rate range and requested availability dates. Enums and bounds are fixed in the API/data-model contract.

Stored booking state is confirmed/cancelled. Derive effective upcoming/ongoing/completed from dates for non-cancelled records. Count confirmed records with dueDate >= today toward the customer's maximum of three. Customer cancellation and customer/admin date edits require today < original startDate. Admin emergency cancellation additionally permits ongoing records; completed/cancelled history is not recancelled. Cancellation is idempotent in its effects, never releasing a slot twice.

Company view defaults: approved companies see all statuses of own-vehicle bookings with current customer name/email/telephone and booked vehicle/branch/rate snapshots. They cannot edit/cancel bookings. Document and review/suspension reasons are company/admin data, not public listing fields. Record admin suspension reason and reactivation resolution note; no unrelated admin CRUD is added.

## Transactions and concurrency

Centralize booking eligibility, overlap, cap, cancellation and effective-state predicates. All creates/date edits/suspension must check current provider eligibility and serialize on the provider document. Vehicle competing interval writes serialize on the vehicle document; cap-changing paths serialize on a per-user guard revision. Use one consistent lock/write order (provider, affected users sorted by ID, vehicles sorted by ID) with bounded retry of transient transaction conflicts. A read/count inside a transaction alone does not eliminate write skew.

Prefer recomputing effective cap from the predicate under a shared user guard over maintaining a counter needing daily decrements. Suspension and future/ongoing cancellation commit together for the course-sized dataset. Application approval atomically switches approved-profile reference without clearing suspension. Rate/branch/window changes must coordinate with booking snapshot/eligibility reads so a booking uses a coherent listing state. Flesh out the exact queries, index selections and service signatures in the implementation contract and test races on a real isolated Atlas test database.

## Verification and documentation

Use Node's built-in `node:test` and assert for date, pricing, state and permission predicates. Integration checks use native fetch against an ephemeral local app with a dedicated Atlas test database; add extra test libraries only if they materially simplify the agreed tests. No real personal/business documents in fixtures.

Keep a runnable Postman collection and secret-free environment template; use Runner/Newman for the required automated demo. Cover signup roles, logout token reuse, ownership reads/writes, pending/rejected/suspended states, profile versions, unique VIN, 30-day boundaries, price/branch snapshots, cap/overlap races and admin emergency cancellation. Mocks alone cannot establish database uniqueness or transactional behavior.

Use swagger-ui-express at `/api-docs` to serve the committed authoritative OpenAPI JSON. This intentionally replaces annotation-based swagger-jsdoc generation with one source; it preserves the taught Swagger UI workflow without duplicate contracts. Build the matching runnable collection from the spec and add assertions; both partners review changes. No hosted workspace setup is required.

Provide dev/start/test/seed/reset commands, separate developer/test databases, .env.example and .gitignore when scaffolding. Tests must refuse destructive resets outside the explicitly named test database. Use short branches, partner review and one owner per shared file. Both partners write code and their diagrams. The final task plan is now in implementation-plan.md with separate handoffs. That plan does not claim the backend or live tests already exist.
