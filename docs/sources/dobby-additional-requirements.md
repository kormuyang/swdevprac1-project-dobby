# Dobby additional requirements and user clarification

Source: user message in this chat, received 2026-11-11. These are user-supplied group requirements, separate from the original PDFs. Preserve the text below as evidence rather than silently changing it when design decisions change.

## Additional Requirement Group “Dobby”

The system shall allow a rental company representative to create a provider account by submitting the company’s legal name, business registration number, registered address, telephone number, email address, and required business documents. The system shall initially assign the account a “pending” status. An admin shall be able to approve or reject the registration and shall provide a rejection reason when rejecting it. Only an approved rental company shall be allowed to register vehicles or receive new bookings.

The system shall allow an approved rental company to create, view, update, and deactivate only the vehicles associated with its own account. Each vehicle record shall include a unique vehicle identification number, model, transmission type, fuel type, seating capacity, pickup branch, and rental price. The system shall reject duplicate vehicle identification numbers and shall prevent a company from modifying or accessing another company’s vehicle records.

The system shall allow an approved rental company to view only the bookings associated with its own vehicles. Each booking response shall include the booking identifier, registered user’s name and contact information, vehicle details, pickup branch, rental dates, and total price. An admin shall retain access to bookings from all rental companies.

The system shall allow an admin to suspend an approved rental company when the company violates platform rules. A suspended company shall be prevented from creating or updating vehicle listings and from receiving new bookings. The system shall automatically cancel all future bookings associated with the suspended company. An admin shall be able to reactivate the company after the suspension reason has been resolved.

## User clarification and delegated choice

- Meaning of the base booking limit: **“three total bookings per user.”** This settles the unit and per-user scope, but does not explicitly define whether cancelled/completed records count.
- The user requested a technology choice with ease of development in mind and stated greater familiarity with MongoDB.
- No course starter path was supplied in this answer.

## Subsequent user clarification (2026-11-11)

“From what I understand a user can only have 3 advance bookings. (thinking of cancelled or completed bookings as -1)”

Use this later clarification in place of the earlier ambiguous total-history reading: cancelled and completed bookings do not consume slots. The meaning of in-progress rentals and date boundaries is still to be agreed.

## Subsequent user scope decisions (2026-11-11)

The user excludes starter code and deadlines from the current design discussion. Business documents will be submitted as external document links; the project will not host image/file storage. The original requirement wording above remains source evidence.

## Subsequent spoken Thai design answers (2026-11-11)

Summary of the user's transcribed message, not a verbatim quotation: three roles (customer, admin, company representative); up to three advance bookings; date-only Thailand calendar; same-day rental allowed, minimum one day, maximum one month; vehicles available indefinitely except booked intervals; same-vehicle overlaps rejected, different vehicles may be booked by one customer over overlapping periods; automatic completion after due date; cancellation retains records; edit dates only; one specific vehicle per booking; THB without extra fees; listing price changes do not increase existing bookings' rates; representative accounts cannot book as customers; email and company registration number unique. User asks to compare separate representative signup against customer-to-representative conversion. “One month,” ongoing-rental cap treatment, date-edit pricing, and exact signup choice are not yet resolved.

## Further spoken Thai design answers (2026-11-11)

Summary, not a verbatim quote: backend only; ongoing rentals consume a slot until after dueDate; maximum duration 30 days; original daily THB rate retained on date edits; no cancelled-booking restoration; separate customer/company signup; profile submissions stored as independently reviewed versions and rejected applications may resubmit; latest approved profile stays in use while a newer one is pending; one HTTPS document link, Google Drive acceptable; after a vehicle has bookings only its rate may change; deactivation blocks only new bookings, retaining existing ones; suspension cancels ongoing as well as upcoming bookings, reactivation never restores them; suspended accounts can read own information; unauthenticated visitors may browse cars but not bookings; admin may edit dates with overlap checks and cannot create bookings; email verification and password recovery excluded. User will supply teaching materials to inform remaining technical choices and task allocation.

The cancellation speech contains conflicting fragments, but the concrete example permits cancellation only before the start day. Record this as a reading to confirm, not an unambiguous quote. A per-vehicle availability start/end window was raised as a design idea; today-booking policy and exact window behavior remain unsettled.

## Further numbered confirmations (2026-11-11)

User accepts vehicle availability-window proposal (including today booking), confirms pre-start edit/cancel cutoff except admins may emergency-cancel ongoing bookings, accepts one immutable pending application at a time, and selects separate login/company contact emails. User does not understand the vehicle-lock/reactivation question; it remains unresolved. User replaces earlier suspended read access with no company operations while suspended. Document handling should remain minimal: one HTTPS link, no extra processing.

## Vehicle confirmation and course example (2026-11-11)

User permits pickup-branch and price edits only, because other fields belong to the fixed vehicle specifications, and accepts vehicle reactivation. User supplies `example/` as evidence of term-taught practices and authorizes proposing/selecting missing technical practices. These are separate from the PDF requirements. Reference example files remain unchanged; see ../example-review.md for the review scope.
