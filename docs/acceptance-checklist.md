# Test checklist

These tests are planned, not run; no test scripts or feature tests currently exist. Use node:test for pure rules, isolated Atlas integration for DB behavior, and Runner/Newman for the demo. Check what was saved as well as the response.

## Test data

Fix Thailand today to 2030-01-10 in unit tests. Integration/demo dates can be relative to Thailand today. Use two customers (U1/U2), two companies (P1/P2), pending/rejected/suspended accounts, an admin and synthetic HTTPS links. Seed repeatably and record the test database/run.

## Accounts and company review

| ID | Check | Owner | Requirements |
| --- | --- | --- | --- |
| T01 | Signup requires name, telephone, email and password. Assign user; reject role/admin/providerId input. | A | FR-01, NFR-01 |
| T02 | Reject duplicate normalized emails, wrong passwords and missing/expired/revoked tokens. | A | FR-02, NFR-01 |
| T03 | Login returns token/expiry. Logout invalidates that session; another active session still works. | A | FR-02 |
| T04 | Account/login responses hide hashes and session data. An unrelated save does not rehash the password. | A | NFR-02 |
| T05 | Company signup creates the account, provider and pending v1 together. A duplicate failure leaves no partial records. | A | FR-10 |
| T06 | Pending/rejected companies can read their applications, but cannot add vehicles or receive bookings. Company accounts cannot book. | A+B | FR-10, FR-11 |
| T07 | Only admins review pending applications. Rejection needs a reason. | A | FR-11 |
| T08 | Resubmission creates an immutable version and keeps history. Concurrent submissions leave at most one pending version. | A | FR-10, FR-11 |
| T09 | Pending/rejected revisions keep the approved public profile. Approval switches it atomically. | A+B | FR-03, FR-11 |
| T10 | Approving a revision does not clear suspension. | A | FR-14 |
| T11 | Accept one HTTPS document URL without fetching it. Reject missing/invalid URLs; hide documents from public discovery. | A+B | FR-10, NFR-02 |

## Vehicles

| ID | Check | Owner | Requirements |
| --- | --- | --- | --- |
| T12 | An approved company can create a vehicle with the required fields. Set ownership on the server. | B | FR-12 |
| T13 | Reject duplicate normalized VINs across companies, inactive vehicles and concurrent inserts. | B | FR-12 |
| T14 | P2 cannot list/read/change/activate/deactivate P1 vehicles. Private IDs return 404. | B | FR-12, NFR-02 |
| T15 | Allow branch/rate edits only. Reject VIN/model/seats/owner changes. | B | FR-12 |
| T16 | Deactivation stops new bookings and keeps existing ones. Approved owners can reactivate without restoring cancellations. | B | FR-12 |
| T17 | Bookings fit the inclusive offering period. Reject window edits that exclude upcoming/ongoing confirmed bookings. | B | FR-03, FR-12 |
| T18 | Discovery shows approved, active, non-expired listings and safe provider fields. Check allowed filters, page limits and filtered totals. | B | FR-03, NFR-02 |

## Bookings

| ID | Check | Owner | Requirements |
| --- | --- | --- | --- |
| T19 | Accept today, same-day and 30-day rentals. Reject past starts, invalid/reversed dates and 31 days. Check host-independent timezone boundaries. | B | FR-03 |
| T20 | Reject same-vehicle overlap, including a shared endpoint. Allow the next day and overlapping rentals on different vehicles. | B | FR-03 |
| T21 | Count at most three upcoming/ongoing bookings. Exclude cancelled/completed records; completion needs no scheduled/manual job. | B | FR-03 |
| T22 | Concurrent bookings across providers cannot give one customer a fourth counted booking. | B | FR-03 |
| T23 | Concurrent overlapping requests cannot double-book a vehicle, including requests from different customers. | B | FR-03 |
| T24 | Reject client ownership, provider, total, status and rate fields. The server sets snapshots, rate and THB total. | B | FR-03, NFR-02 |
| T25 | U1 sees only their list/detail. U2 cannot read/edit/cancel U1 bookings; admin can read either. | B | FR-04, FR-07, NFR-02 |
| T26 | Before the old start, customer/admin edits dates only. Keep owner/vehicle/provider/branch/rate, recalculate total and exclude self from overlap. | B | FR-05, FR-08 |
| T27 | Date edits recheck eligibility, window, duration, cap and overlap. Reject edits once the original rental starts. | B | FR-05, FR-08 |
| T28 | Customer cancellation before start keeps history and frees one slot. Repeating it has no effect; ongoing customer cancellation is denied. | B | FR-06 |
| T29 | Admin can cancel ongoing rentals, but cannot create bookings or edit ongoing dates. Completed bookings cannot be cancelled. | B | FR-08, FR-09 |
| T30 | Later branch/rate changes leave booked snapshots unchanged, including after a date edit. | B | FR-03, FR-13 |

## Company views and suspension

| ID | Check | Owner | Requirements |
| --- | --- | --- | --- |
| T31 | Approved P1 sees only own-vehicle bookings across all statuses, with ID, current customer name/email/phone and booked vehicle/branch/dates/total. | B | FR-13 |
| T32 | P2 cannot read P1 bookings through company routes. Company accounts cannot change bookings. | B | FR-13, NFR-02 |
| T33 | Admin suspension needs a reason and cancels upcoming/ongoing bookings atomically. Keep completed/cancelled history and other companies unchanged. | A+B | FR-14 |
| T34 | If cancellation fails, roll back both suspension and every booking cancellation. | A+B | FR-14 |
| T35 | Race suspension against creation/date edits. Successful suspension leaves no confirmed non-completed booking for that provider. | A+B | FR-14 |
| T36 | While suspended, old sessions and fresh login cannot grant protected reads/writes. Logout works; public discovery leaks no private data. | A+B | FR-14, NFR-02 |
| T37 | Reactivation needs admin and a resolution note. Restore eligibility, not bookings; reject repeated invalid transitions. | A+B | FR-14 |
| T38 | Return `{success:false,message}` with appropriate HTTP status for missing/malformed IDs, operator objects, unknown fields, bad pagination, oversized bodies and auth throttling. | A+B | NFR-01, NFR-02 |
| T39 | Public provider/vehicle responses never populate private bookings, applications, customer contact or document links. | B | NFR-02 |

## Demo and delivery

| ID | Check | Owner | Requirements |
| --- | --- | --- | --- |
| T40 | Run auth → onboarding → review → vehicle → bookings → emergency cancel/suspension → reactivation, with assertions and clean fixtures. | A+B | FR-01–FR-14, NFR-04 |
| T41 | Measure successful and denied endpoints against three seconds. Record conditions and failures, not just averages. | A+B | NFR-03 |
| T42 | The API, use cases, sequence/API diagrams, contributions and demo of at most seven minutes match the implementation. | A+B | Course documentation/demo |

## Measurement protocol for T41

Use one local Node process and a warmed Atlas connection, with two providers, ten vehicles and thirty historical bookings. Send representative requests sequentially, ten times per endpoint. Each measured request must finish within 3000 ms.

Record machine/runtime, DB region, dataset, endpoint, status, each elapsed time and the maximum. Identify the test cluster without credentials. Measure cold-start separately.

Note: this checks the stated dataset and conditions, not production load. Run the T22/T23/T35 races separately.

## Recording results

For each PR, list test IDs, command, test environment/database, pass/fail counts and anything unverified. Link tests, collection and short logs without credentials or tokens. Both partners review shared cases before merge.
