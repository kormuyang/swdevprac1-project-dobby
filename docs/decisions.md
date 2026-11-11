# Decisions and open questions

Updated 2026-11-11 after the user supplied Dobby additions, confirmed the cap, and delegated the ease-of-development technology choice. Accepted choices below are distinct from unresolved domain assumptions. Proposals are not approvals. Add the answer, who agreed, date, and evidence when resolving an entry. Instructor clarification should be recorded as such; a team assumption must remain identifiable as a team assumption.

## Accepted choices and confirmed scope

- **D-15 — document delivery selected:** external document links in registration; backend stores URL metadata only. No file/image upload or storage subsystem.
- **D-16 — planning scope selected:** do not require starter code or deadlines to finish this design.

- **D-00 — stack selected (2026-11-11):** MongoDB Atlas, Node.js, Express, Mongoose, JavaScript, one application. Basis: user delegated selection, prefers ease of development, and knows MongoDB better. Starter code and deadlines are excluded from current design prerequisites by the user; do not pin versions from the old syllabus.
- **D-01 — clarified by user (2026-11-11):** at most three advance bookings per user; cancelled and completed bookings do not count. This supersedes the previous total-history interpretation. Ongoing rentals count until the due date has passed, unless cancelled. Later user answers settle this in D-22. Do not impose a per-date or per-provider cap.
- **D-02 — implementation default:** email/password login, matching Project 7; no extra username field. This is a design interpretation, not a separate instructor clarification.
- **D-05 — database resolved:** MongoDB Atlas. Starter code is not a design prerequisite at the user’s request.
- **D-11 — onboarding now assigned:** provider accounts start pending and require admin review. Proposed initial admin provisioning is a controlled seed; no public admin registration. Public provider-list access is still to be agreed.

### Latest user-confirmed domain decisions

- **D-17 — rental calendar:** date-only `startDate` and `dueDate`, Asia/Bangkok, both dates inclusive. Same-day rentals are valid and count as one day. A booking ending on the 5th releases the vehicle on the 6th. Duration is at least one day, at most 30 inclusive days, as clarified in D-22. No manual pickup/return workflow.
- **D-18 — availability:** one booking references one specific vehicle. Active vehicles are available on every date from their entry into the system, except intervals blocked by existing non-cancelled bookings. Reject same-vehicle overlaps, including a shared boundary date; allow one customer to book different vehicles over overlapping dates, subject to the cap. No short advance horizon is selected.
- **D-19 — cancellation and edits:** cancellation preserves the booking record; never hard-delete it as the ordinary delete operation. Edit only rental dates, retaining the same customer, provider, and vehicle, and recheck overlap excluding the booking being edited. Cancelled bookings cannot be restored. Confirmed later: customers edit/cancel before startDate; admins edit before startDate but may cancel ongoing rentals.
- **D-20 — price:** THB, rental price only, no additional fees. Companies can change listing rates, but existing bookings retain their original booked rate even for far-future rentals. Later date edits retain the original rate and recalculate total for the new duration. This is a price calculation only; no payment processing is included.
- **D-21 — account separation:** customer, company representative, and admin are distinct roles. Company representatives cannot make customer bookings. Login email must be unique; company registration number must be unique as a project rule. No jurisdiction-specific legal format or verification claim is implied. Separate customer and company signup is selected; no customer-to-company conversion.

See [architecture.md](architecture.md) for rationale and proposed implementation details.

**Current remaining-question checklist:** [design-questions.md](design-questions.md). It expands and consolidates the entries below without requiring starter code, deadlines, or a file-storage subsystem.

### Latest user answers: D-22–D-27

- **D-22 — booking:** backend REST API only. The three-booking cap includes ongoing rentals until dueDate has passed; cancelled/completed records do not count. Maximum duration 30 inclusive days. Cancelled bookings require a new booking, never restoration. Later user confirmation: edit/cancel only before startDate, except admin emergency cancellation may cancel ongoing rentals.
- **D-23 — rates:** daily THB rate entered by company, computed by server. Date edits keep booked daily rate and recalculate days/total. No payments, fees, deposits, or refund workflow.
- **D-24 — signup and reviews:** separate customer/company signup. Preserve every submitted company profile as a versioned application with pending/approved/rejected review state. Rejected companies may resubmit. While a newer version is pending or rejected, continue using the latest approved profile. No frontend pending screen is in scope; API returns status and review data.
- **D-25 — documents:** one external HTTPS document link per submitted profile, Google Drive acceptable; no file/image hosting or backend fetching. Specific legal-document validation is not selected.
- **D-26 — vehicle:** after a vehicle has bookings, its pickup branch and price may change among descriptive fields (latest user correction); activation/deactivation remains a separate operation. Deactivation blocks new bookings and retains existing bookings. Reactivation is confirmed for approved companies; fixed vehicle identity/specification fields are not editable. Availability-window fields were raised for discussion, not accepted yet.
- **D-27 — suspension/access:** suspension cancels all non-completed, non-cancelled bookings, including ongoing rentals, and preserves history. This extends the base addition’s future-booking minimum. Do not cancel completed history. Reactivation never restores bookings. Superseded by D-29: suspended representatives cannot use protected company operations, including reads. Public visitors may browse rental vehicles, never booking history. Admin cannot create bookings; can edit dates under the same overlap checks. Email verification/password recovery are excluded. Technical conventions and final work split will be revisited using course materials the user intends to provide.

### Latest confirmations: D-29–D-32

- **D-29:** suspended means no protected company read or write operations. This replaces the earlier read-only permission. Authentication can return a suspension denial; no frontend workflow is needed.
- **D-30:** vehicle availability window accepted: required start, optional end, booking entirely within window; reject window edits conflicting with existing upcoming/ongoing bookings. Start-today booking allowed under the accepted proposal.
- **D-31:** ordinary customer edit/cancel only before startDate. Admin date edits use the same restriction, but admin emergency cancellation can cancel ongoing bookings. Retain cancellation history and enforce overlap/price rules on date edits.
- **D-32:** one immutable pending company application at a time accepted; login email and company contact email separate; one HTTPS document URL stored without unnecessary document-processing rules. One representative per company and account/registration identity changes have not been expressly resolved.

### Course-example review and delegated technical choices: D-33–D-36

- **D-33 — user confirmation:** vehicle updates allow pickup branch and rate only; other vehicle identity/specification fields remain fixed. Approved companies may reactivate their inactive vehicles. Earlier price-only/permanent-first-booking-lock proposals are superseded.
- **D-34 — selected technical practice:** JavaScript/CommonJS, Node 24, Express 5, Mongoose 9, MongoDB Atlas, familiar route/controller/model separation plus services, dotenv, bcryptjs, JWT Bearer, Swagger and Runner/Newman. Evidence: user-supplied `example/`; the user authorized choosing missing technical details. Read [example-review.md](example-review.md) for reuse limits.
- **D-35 — JWT sessions:** supersedes opaque-token proposal. JWT includes session ID; persisted session state supplies actual logout revocation. Default lifetime 24 hours, concurrent logins allowed, current-session logout; no refresh/cookie auth subsystem.
- **D-36 — engineering defaults:** one representative per company, immutable login email/company registration number, company contact email versioned separately, booking-time branch/vehicle/rate snapshots, current customer contact in approved-company booking responses. Use explicit input allowlists, centralized errors, transactional concurrency guards, isolated databases, node:test, and Postman demo. These are selected engineering defaults under user delegation, not instructor requirements. Full detail: [technical-design.md](technical-design.md).

### Portable planning baseline: D-37–D-38

- **D-37 — standalone practice/contracts:** the user will not publish the reference example, so practices.md, data-model.md, service-contracts.md, api-contract.md and contracts/openapi.json are self-contained. The reference is optional historical evidence only. OpenAPI JSON is authoritative and served directly by Swagger UI; do not maintain a second annotation-generated spec.
- **D-38 — ready work split:** implementation-plan.md and handoffs/partner-a.md / partner-b.md define ownership, task dependencies, API/service boundaries and T01–T42 acceptance gates. A owns platform/auth/provider review/orchestration; B owns vehicles/bookings/cancellation. No new product clarification blocks starting A00/B00. Scaffold and live behavior are still implementation work.

## Current design status

See [design-questions.md](design-questions.md) for the short active list. Superseded questionnaire items are not current blockers.

| ID | Question / proposal |
| --- | --- |
| D-03 | Resolved by D-30/D-31: availability windows, booking today, and edit/cancel cutoffs. |
| D-04 | Resolved by D-34/D-35 after inspecting the supplied example. |
| D-06 | Scoped measurement conditions defined in acceptance-checklist.md T41; run evidence is future implementation work. |
| D-12 | Resolved by D-29: no protected company operations while suspended. |
| D-13 | Resolved: one HTTPS URL, company/admin visibility, manual review, minimal syntax validation; no document-fetching or hosting. |
| D-14 | Resolved by D-33 and engineering defaults in technical-design.md. |
| D-28 | Concurrency/email separation settled; identity/cardinality defaults selected in D-36. |

## Resolve before final delivery

| ID | Question | Why it matters / proposed next step |
| --- | --- | --- |
| D-07 | What is the required UML Profile for API format, and which baseline diagrams are supplied? | Obtain the instructor's example and document the changed scope in that notation. |
| D-08 | Deferred course logistics | Starter and deadline are excluded from this design discussion by user request. Keep syllabus expectations as source evidence; do not treat them as current planning blockers. |
| D-09 | Resolved: Saint owns A; Poom owns B. | User-assigned roles; use corresponding handoffs and cross-review. Record actual code/diagram contributions. |
| D-10 | What are the extra-credit rules, video expectations, and AI-use/disclosure rules? | Syllabus lists extra credit and a teaching-video link but does not give a complete policy. Neither supplied document contains an explicit AI-use policy. |

## Decision record template

```text
ID:
Status: open / proposed / accepted / superseded
Question:
Decision:
Basis: instructor clarification / supplied source / team choice
Evidence or source:
Agreed by:
Date:
Affected requirements, code, diagrams, and tests:
Supersedes (if any):
```

Record accepted decisions here or link a separate architecture decision record when a choice needs a longer explanation. Do not add a new framework or external service merely to fill an unresolved entry.
