# Demo guide

The [Postman collection](../postman/dobby.postman_collection.json) follows the required user and admin sequence first. Dobby additions follow section 12. Use one collection and one iteration.

## Before the run

Use Node 24 and follow [README setup](../README.md#setup). Start the local API with `npm run dev`.

Create the administrator with `npm run seed-admin`. This command creates only the admin. The example credentials are `admin@example.test` and `admin1234`. They work only if you create the account with those values. An existing admin keeps its current password.

Prepare one approved provider with an active vehicle through the API before the demonstration. Use Swagger UI at `/api-docs` to register a provider, log in as admin, approve its application, and create a vehicle as that provider. The vehicle must be available from five through thirteen days after the run date, with no overlapping confirmed bookings. This preparation is outside the graded request sequence. Admin creation does not create vehicles or providers.

The required flow uses this existing vehicle because product viewing and booking precede the extra-credit provider creation. The extra-credit sections create a separate provider and vehicle. They do not suspend the provider used by the required flow.

## Postman Runner

1. Import [the collection](../postman/dobby.postman_collection.json) and [the example environment](../postman/dobby-local.postman_environment.json).
2. Select Dobby local demo.
3. Make sure that `baseUrl` matches the running API. The default is `http://127.0.0.1:5003/api/v1`.
4. Use the example admin credentials, or enter the credentials of your existing admin locally.
5. Open Dobby required sequence and extra credits.
6. Select Run collection.
7. Select all sixteen sections in their saved order.
8. Use one iteration and no data file.
9. Start the run from Register user.

The full run contains 36 requests and 57 assertions when all expected branches succeed. To show only the required flow, select sections 01–12. These sections contain 15 requests. Expected 400, 403, 404 and 409 responses demonstrate rejected actions. Their assertions must pass.

The first request generates unique sample accounts and Thailand calendar dates. Requests save tokens and record IDs in `pm.variables`. These values exist only during the run. Postman does not read `.env`.

Section 03 selects the first vehicle available for the full date range. To select a particular vehicle, add an optional `coreVehicleId` environment value. Leave it empty for automatic selection. If no matching vehicle exists, the run stops with an assertion that explains the prerequisite.

Section 04 creates two bookings for the same user on different dates. The user edits and cancels the first booking. The admin edits and cancels the second booking after the user logs out. A cancelled booking cannot be edited, so the admin needs the second booking.

The run creates accounts, applications, vehicles and bookings. It leaves these sample records for inspection. A new run uses fresh account identifiers. Do not export credentials, tokens or private response data.

## Saved request sequence

| Section | Purpose                                          | Requests |
| ------- | ------------------------------------------------ | -------- |
| 01      | User Registration + Validation Check             | 2        |
| 02      | User Log-in                                      | 1        |
| 03      | User View Product                                | 1        |
| 04      | User Create Booking + Check Create Condition     | 3        |
| 05      | User View Own Booking                            | 1        |
| 06      | User Edit Own Booking                            | 1        |
| 07      | User Delete Own Booking                          | 1        |
| 08      | User Log-out                                     | 1        |
| 09      | Admin Log-in                                     | 1        |
| 10      | Admin View Any Booking                           | 1        |
| 11      | Admin Edit Any Booking                           | 1        |
| 12      | Admin Delete Any Booking                         | 1        |
| 13      | Extra Credits - Provider Registration and Review | 5        |
| 14      | Extra Credits - Own Vehicle Management           | 7        |
| 15      | Extra Credits - Provider Booking View            | 3        |
| 16      | Extra Credits - Suspension and Reactivation      | 6        |

The first twelve sections match the supplied table. Section 01 includes registration validation. Section 04 includes the rejected overlapping booking. All extra-credit requests occur in sections 13–16.

## Newman

After preparing the admin and available vehicle, run `npm run test:demo` against the local API. It loads the selected `.env` file and supplies the admin credentials to the same collection. It generates no separate request sequence. The command prints request and assertion counts without printing tokens or response bodies.

## Seven-minute outline

| Time      | Show                                                   | Purpose                                                               |
| --------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| 0:00–0:30 | Scope and synthetic replica-set setup                  | Explain roles and the test environment.                               |
| 0:30–1:30 | Signup, provider review and profile versions           | Show approval and preservation of the approved profile during review. |
| 1:30–2:30 | Vehicle creation and date-filtered discovery           | Show approved ownership and availability.                             |
| 2:30–4:00 | Booking, listing change and date edit                  | Show server pricing and preserved snapshots/rates.                    |
| 4:00–4:45 | Customer cancellation and admin emergency cancellation | Show cutoff differences and retained history.                         |
| 4:45–6:00 | Suspension and reactivation                            | Show cancellation, protected-session denial and no restoration.       |
| 6:00–7:00 | Test evidence and remaining limits                     | Use Postman results, response times and actual contribution records.  |

Allow up to three minutes afterward for questions. The collection asserts the API journey; integration tests separately inspect saved data and real database races. Use Postman's displayed response times to check the three-second requirement and record the request, status and duration. These timings describe the requests and environment used in that run.

## Delivery checks

- Update the [use cases](use-cases.md), [API map](diagrams/api.md), design sequence diagrams and [contributions](contributions.md) when the implementation changes.
- D-07: Chapter 6 slide 32 now supplies the REST UML profile reference. Use the [use case](use-case-diagrams.md), [REST UML](api-diagram.md) and [sequence](sequence-diagrams.md) pages and check their presentation readability; final instructor/partner acceptance is not implied (D-59).
- D-10: confirm AI disclosure, extra credit and teaching-video expectations. No institution-specific policy is inferred.
- Review and merge timing follow D-43; Saint reviews integrated main afterward.
- D-45 defers the existing Newman dependency findings. Use the trusted project collection against the local API; remediation remains open.
