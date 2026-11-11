# Assigned requirements

Source: `SW_Dev_Projects.pdf`, pp. 2–3 and 11. Page numbers below are one-based PDF pages. Other projects in that PDF are not assigned scope. Additional source: [Dobby requirements and clarification](sources/dobby-additional-requirements.md), supplied by the user on 2026-11-11.

## Functional requirements: Project 7

These are faithful paraphrases of the nine numbered requirements on p. 11. The IDs are local documentation identifiers.

| ID | Assigned behavior | Source |
| --- | --- | --- |
| FR-01 | Allow registration using name, telephone number, email, and password. | p. 11, item 1 |
| FR-02 | After registration, allow the registered user to log in with email and password and to log out. | p. 11, item 2 |
| FR-03 | After login, allow a registered user to book up to 3 cars by specifying the date and preferred rental car provider. Provide a rental car provider list; each provider has a name, address, and telephone number. | p. 11, item 3 |
| FR-04 | Allow a registered user to view their own rental car bookings. | p. 11, item 4 |
| FR-05 | Allow a registered user to edit their own rental car bookings. | p. 11, item 5 |
| FR-06 | Allow a registered user to delete their own rental car bookings. | p. 11, item 6 |
| FR-07 | Allow an admin to view any rental car bookings. | p. 11, item 7 |
| FR-08 | Allow an admin to edit any rental car bookings. | p. 11, item 8 |
| FR-09 | Allow an admin to delete any rental car bookings. | p. 11, item 9 |

## Additional functional requirements: Dobby

These IDs paraphrase the user-supplied additions; they are required scope, not optional extra-credit features unless the instructor says otherwise.

| ID | Assigned behavior | Source paragraph |
| --- | --- | --- |
| FR-10 | Allow a representative to register a provider account with legal company name, business registration number, registered address, telephone, email, and required business documents; initially pending. | Dobby 1 |
| FR-11 | Admin can approve or reject registration; rejection requires a reason. Only approved companies may register vehicles or receive new bookings. | Dobby 1 |
| FR-12 | Approved companies can create, view, update, and deactivate only their own vehicles. Include VIN, model, transmission type, fuel type, seating capacity, pickup branch, and rental price. Reject duplicate VINs and prevent cross-company vehicle access/modification. | Dobby 2 |
| FR-13 | Approved companies can view only bookings for their own vehicles. Include booking ID, customer name/contact information, vehicle details, pickup branch, rental dates, and total price. Admin retains access across all companies. | Dobby 3 |
| FR-14 | Admin can suspend an approved company for platform violations. Suspended companies cannot create/update listings or receive new bookings. Automatically cancel all their future bookings. Admin can reactivate after the reason is resolved. | Dobby 4 |

The user clarified FR-03 as **at most three advance bookings per user**, excluding cancelled and completed bookings; it is not a per-car-quantity, per-provider, or per-date cap. The additions introduce specific vehicles, rental dates, and pricing. Confirmed model: one booking references one specific vehicle and its provider; no multi-car quantity field. Cancelling or completing a counted booking releases one slot; the count cannot fall below zero. Ongoing rentals still count until dueDate has passed, unless cancelled. Maximum duration is 30 inclusive days.

## Shared non-functional requirements and constraints

| ID | Assigned requirement | Source |
| --- | --- | --- |
| NFR-01 | Authenticate users using username and password. | p. 2, Security |
| NFR-02 | Keep users' transactions confidential. | p. 2, Security |
| NFR-03 | Respond to a request within 3 seconds. | p. 2, Performance |
| NFR-04 | The system must be usable and testable through Postman. | p. 2, Usability |
| CON-01 | Implement a web API using REST APIs. | p. 3 |
| CON-02 | A frontend is not required. | p. 3 |
| CON-03 | Use either MongoDB Atlas or PostgreSQL. | p. 3 |

NFR-01 uses “username,” while FR-02 explicitly uses email. **Selected team interpretation:** email is the login identifier; no separate username field. This is D-02, an engineering interpretation consistent with Project 7, not a clarification written in the PDF.

## Access rules to preserve

| Operation | Customer | Company representative | Admin |
| --- | --- | --- | --- |
| Create booking | After login, within own cap | Cannot make customer bookings | Cannot create bookings |
| View/edit/delete booking | Own bookings | Approved: view bookings for own vehicles; editing/deleting not granted | Any booking |
| Register company | Public onboarding with credentials and required company data/documents | Initial status pending | Approve/reject pending registration |
| Vehicle create/view/update/deactivate | No management rights | Approved: own vehicles only | No extra vehicle-management rights selected |
| Provider list | Public approved-provider list | No additional privilege inferred | May review applications |
| Suspend/reactivate provider | No | No | Approved → suspended; suspended → approved |

Company booking responses intentionally disclose the required customer name/contact details to the owning approved company. Confidentiality must therefore enforce this authorized purpose and prevent disclosure to other companies or unrelated users. Business-document links are restricted application data, not public provider-list fields. The user selected externally hosted document URLs instead of backend file/image uploads or storage.

**Derived security checks:** enforce owner/company filters on list and individual-resource operations, derive role/owner/provider from trusted server context, and keep password material out of responses. Pending, rejected, or suspended status must never bypass approval checks through a stale login credential.

## Boundaries and ambiguities

The additions require vehicle inventory, rental pricing/dates, company approval, and suspension cancellation. Payments, reviews, notifications, password reset, a frontend, and a full branch-management subsystem remain outside assigned scope. Do not import dates or booking rules from other projects.

The user selected inclusive date-only start/due dates in Asia/Bangkok, same-day rentals, no manual return step, same-vehicle overlap rejection, cross-vehicle overlap allowance, retained cancellations, date-only edits, and THB with grandfathered booking rates. See D-17–D-21 in the decision register. Later answers confirm 30 inclusive days, ongoing rentals count toward the cap, and suspension cancels upcoming and ongoing bookings. Later confirmation accepts an explicit vehicle availability window and booking starting today. Customers edit/cancel only before startDate; admin date edits follow that cutoff but admin emergency cancellation may cancel ongoing rentals. Suspended representatives have no protected company read/write access. See D-22–D-28. One HTTPS document link per versioned company application is selected. Company profile revisions require review; latest approved data remains in use while revisions are pending/rejected. Only one immutable pending version is allowed; login and company contact emails are separate. Identity/cardinality engineering defaults are recorded in D-36. Vehicle update fields are pickup branch and price; approved companies may reactivate their vehicles. Existing bookings preserve their pickup-branch/rate snapshots. Suspension must also handle concurrent booking creation/editing safely; reactivation must not silently restore cancelled bookings without an explicit rule.

The assignment does not prescribe token mechanics; JWT session revocation is selected in D-35. The scoped response-time protocol is documented in acceptance-checklist.md T41; see D-06. The original PDFs remain unchanged evidence even where the additions extend their scope.
