# Acceptance checklist and evidence map

All cases below are **planned, not yet run**. IDs are shared references in work packages and PRs. Use node:test for pure rules; real isolated Atlas integration for authorization/index/transaction behavior; Runner/Newman for the automated demo. Snapshot/state assertions matter as much as HTTP status.

Fixed unit-test clock: Thailand today 2030-01-10. Integration demo may compute future dates relative to Thailand today. Use two customers (U1/U2), two company accounts (P1/P2), pending/rejected/suspended variants, admin, and synthetic HTTPS links. Seed deterministically and record database/test run context.

| ID | Acceptance condition | Owner | Requirements |
| --- | --- | --- | --- |
| T01 | Customer signup requires name/telephone/email/password, assigns user; submitted role/admin/providerId rejected | A | FR-01, NFR-01 |
| T02 | Normalized duplicate login emails conflict; wrong password/missing/expired/revoked token denied | A | FR-02, NFR-01 |
| T03 | Login returns token/expiry; logout revokes current session, old token fails; other active session remains usable | A | FR-02 |
| T04 | No password hash/raw session data in any account/login response; unrelated save does not rehash password | A | NFR-02 |
| T05 | Company signup atomically creates company account/provider/pending v1; failed duplicate leaves no partial records | A | FR-10 |
| T06 | Pending/rejected representative can inspect own application but cannot register vehicles/receive bookings; company cannot create customer booking | A+B | FR-10, FR-11 |
| T07 | Admin approves/rejects pending application; rejection requires reason; ordinary user/company cannot review | A | FR-11 |
| T08 | Rejected company resubmits new immutable version; history preserved; at most one pending version under concurrent submissions | A | FR-10, FR-11 |
| T09 | Pending/rejected revision keeps approved profile and public name/address/phone; approval switches profile atomically | A+B | FR-03, FR-11 |
| T10 | Approving a pending revision during suspension never clears suspended state | A | FR-14 |
| T11 | One HTTPS document URL accepted without fetching; invalid/missing URL rejected; URL excluded from public discovery | A+B | FR-10, NFR-02 |
| T12 | Approved company creates vehicle with all required fields; owner/provider fixed server-side | B | FR-12 |
| T13 | Normalized duplicate VIN conflicts across providers, inactive vehicles and concurrent inserts | B | FR-12 |
| T14 | P2 cannot list/read/change/activate/deactivate P1 vehicles; private ID returns 404 | B | FR-12, NFR-02 |
| T15 | Only pickup branch/rate descriptive changes allowed; attempted VIN/model/seats/owner changes rejected | B | FR-12 |
| T16 | Deactivation blocks new bookings but keeps existing ones; approved owner can reactivate without restoring cancellations | B | FR-12 |
| T17 | Validated from/until window is inclusive; booking must fit; window edits excluding ongoing/upcoming confirmed records conflict | B | FR-03, FR-12 |
| T18 | Public discovery shows only approved active/non-expired listings, safe provider info, allowed filters, bounded pagination and correct filtered total | B | FR-03, NFR-02 |
| T19 | Date rules accept today/same-day/30 days and reject past/invalid calendar/31 days/reversed interval; timezone boundary independent of host timezone | B | FR-03 |
| T20 | Inclusive overlap rejects same vehicle/shared endpoint; adjacent next day succeeds; different vehicles may overlap for one customer | B | FR-03 |
| T21 | At most 3 confirmed upcoming/ongoing bookings per user; cancelled/completed excluded; completion after dueDate requires no manual job | B | FR-03 |
| T22 | Concurrent creates on different providers cannot give the same user a fourth counted booking | B | FR-03 |
| T23 | Concurrent same-vehicle overlapping creates produce no double booking, including different customers | B | FR-03 |
| T24 | Client owner/provider/total/status/rate fields rejected; booked rate/snapshot and THB total calculated server-side | B | FR-03, NFR-02 |
| T25 | U1 sees only own list/detail; U2 cannot read/update/cancel U1 record; admin can read either | B | FR-04, FR-07, NFR-02 |
| T26 | Before old start, customer/admin edit dates only; preserve owner/vehicle/provider/branch/rate; recalc total; exclude self in overlap check | B | FR-05, FR-08 |
| T27 | Date editing revalidates current eligibility/window/duration; cannot bypass cap/overlap; no edit after original rental start | B | FR-05, FR-08 |
| T28 | Customer pre-start cancel retains history, opens one slot; repeat cancel has no second effect; customer cannot cancel ongoing | B | FR-06 |
| T29 | Admin emergency-cancels ongoing but cannot create booking or edit ongoing dates; completed history not cancellable | B | FR-08, FR-09 |
| T30 | Rate/branch changes after booking preserve old booking snapshots, including after a date edit | B | FR-03, FR-13 |
| T31 | Approved P1 sees only own-vehicle bookings with ID/customer name/email/phone/booked details/branch/dates/total, across all statuses | B | FR-13 |
| T32 | P2 cannot read P1 booking via company routes; company has no booking mutation capability | B | FR-13, NFR-02 |
| T33 | Suspend approved provider requires admin/reason and atomically cancels all upcoming/ongoing records; completed/cancelled history and other company unaffected | A+B | FR-14 |
| T34 | Inject cancellation failure: suspension state and every booking cancellation roll back together | A+B | FR-14 |
| T35 | Race suspension against create/date-edit: no surviving confirmed non-completed rental for successfully suspended provider | A+B | FR-14 |
| T36 | Existing credentials and fresh login cannot grant protected reads/writes while suspended; logout still possible; public discovery leaks no private data | A+B | FR-14, NFR-02 |
| T37 | Reactivate requires admin/resolution note, restores company eligibility only, never cancelled bookings; repeated invalid transitions conflict | A+B | FR-14 |
| T38 | Missing/malformed IDs, operator objects, unknown fields, bad pagination, oversized body and throttled auth receive consistent safe errors | A+B | NFR-01, NFR-02 |
| T39 | No public provider/vehicle route populates private bookings/applications/contact/document data | B | NFR-02 |
| T40 | Collection runs auth -> onboarding -> review -> vehicle -> bookings -> emergency cancellation/suspension -> reactivation with assertions and clean fixtures | A+B | FR-01–FR-14, NFR-04 |
| T41 | Measure representative successful and denied endpoints against 3-second target under recorded conditions; retain failures, not only averages | A+B | NFR-03 |
| T42 | Contract, use cases, sequence/API diagrams, contribution evidence and <=7-minute demo agree with final implementation | A+B | Course documentation/demo |

## Measurement protocol for T41

Use one local Node process, Atlas test cluster identified without credentials, synthetic 2 providers/10 vehicles/30 historical bookings, a warmed connection and sequential representative requests. Record machine/runtime/DB region, dataset, endpoint, repetitions (10 each), individual elapsed times, status and maximum; assert each measured request <=3000 ms. Record cold-start separately. This is a scoped verification protocol, not proof for unspecified production load. Concurrency invariants T22/T23/T35 are separate from this latency sample.

## Required evidence per implementation PR

State cases executed, command, target DB/environment, pass/fail counts and material limits. Link committed tests/collection and concise logs without tokens/credentials. No implementation/run evidence exists in the planning package. Both partners review relevant shared cases before merge.
