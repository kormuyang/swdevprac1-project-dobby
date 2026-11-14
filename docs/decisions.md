# Decisions

These are the choices we are working with. The [requirements](requirements.md) explain the product; [design](design.md) gives the technical details. Keep the IDs so existing references still work.

## Accepted decisions

Most choices were agreed on November 11, 2026. “User” means a confirmed product choice. “Default” means a technical choice made under the user's request to prioritize ease of development.

| IDs | Basis | Choice |
| --- | --- | --- |
| D-00, D-05 | Default | One Node/Express backend with Atlas, matching team familiarity. |
| D-01, D-22 | User | Three upcoming/ongoing bookings per customer; rentals last at most 30 inclusive days. Completed history does not count. |
| D-02 | Default | Use email for login; no separate username. |
| D-09 | User | Saint = A; Poom = B. |
| D-11, D-24 | Requirement + user | Admin reviews company applications. Keep submitted versions and use approved data while a revision is reviewed. |
| D-15, D-25, D-32 | User | One HTTPS document link per submitted version, one pending version at a time, separate login/contact emails. Manual review; no fetching or hosting. |
| D-16 | User | No starter-code or deadline prerequisite for this design. |
| D-17 | User | Thailand calendar, inclusive dates, same-day rentals, no manual return. |
| D-18, D-30 | User | Book a specific vehicle within its offering period, without overlap. Today is allowed; no short advance horizon. One customer may book different vehicles over overlapping dates. |
| D-19, D-31 | User | Keep cancelled records. Edit dates/cancel before the original start; admins can also cancel ongoing rentals. No restoration. |
| D-20, D-23 | User | Daily THB rate, no extra fees; date edits keep the booked rate. |
| D-21 | User, reconfirmed November 12 | One role per account. Company/admin cannot create customer bookings. Separate signup, no conversion; unique login email and company registration number. |
| D-26, D-33 | User | Edit vehicle branch/rate only. Deactivation keeps bookings; approved owners can reactivate vehicles. |
| D-27, D-29 | User | Suspension cancels upcoming/ongoing bookings and blocks protected company reads/writes, including old sessions. Admin cannot create bookings. |
| D-34 | Default | Node 24/CommonJS, Express 5/Mongoose 9; routes/controllers/models plus focused services. |
| D-35 | Default | JWT Bearer with revocable sessions. |
| D-36 | Default | One representative per company; immutable login/registration identity; booked vehicle/branch/rate snapshots and current customer contact in company views. Use allowlists, coordinated transaction guards and isolated DB tests. |
| D-37 | User + default | Self-contained docs; example code is optional reference. Swagger serves committed OpenAPI. |
| D-38 | User + default | Keep the A/B split and T01–T42. Features and runtime checks are still to be implemented. |
| D-39 | User, November 13 | Defer a centralized API error abstraction until the codebase is mature enough to demonstrate its value. Services use ordinary errors with HTTP `status`, and controllers map HTTP errors locally. |
| D-40 | User, November 13 | A00 has no shared transaction wrapper. Feature services implement and own their transaction boundaries when needed, passing the same session through all operations in one transaction. |
| D-41 | User, November 13 | API errors use `{success:false,message}` with HTTP status conveying the category. Do not include an error `code` field or require custom error identifiers. |

Booking records supply occupied dates; do not duplicate the list on Vehicle.

## Open decisions

- **D-07:** confirm the instructor's UML Profile for API notation and baseline diagrams before delivery.
- **D-10:** confirm AI disclosure, extra credit and teaching-video expectations. No AI policy or disclosure wording has been agreed.
- **Provider history:** keeping every suspension/reactivation event was proposed but not agreed. For now, the model keeps the latest lifecycle details and all application versions.

Record new decisions with their date, who agreed and affected work. Keep course requirements separate from team defaults.
