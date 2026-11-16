# Dobby requirements

A **provider** is a rental business. A **provider representative** is its login account, stored as a User with role `provider`. The Provider record and its representative User remain separate, linked records. Use provider terminology throughout the API and documentation.

Dobby is a rental car booking backend. There are three roles:

- Customer: books cars and manages their own bookings.
- Provider representative: manages the provider's vehicles and views their bookings.
- Admin: reviews providers, manages bookings across providers and handles suspension.

Each account has one role. Provider representatives and admins cannot create customer bookings.

## Accounts (FR-01, FR-02)

Customers register with their name, telephone, unique email and password. They log in with email/password (NFR-01) and can log out of the current session. The same token must stop working after logout.

Provider signup is separate. Admins are created separately, not through public signup. There is no customer-to-provider conversion.

Access depends on the account:

- Customers can read/change only their own bookings.
- Providers can access only their own applications, vehicles and associated bookings, subject to approval/suspension rules.
- Admins can review providers and access bookings across providers.
- Visitors can browse approved providers and eligible vehicles, but cannot view booking history, customer information or provider documents.

## Provider registration (FR-10, FR-11)

A representative submits login credentials and:

- Legal name and unique business registration number
- Registered address and telephone
- Provider contact email, separate from the login email
- One HTTPS business-document link

Store the link without uploading, hosting or fetching the document.

The provider starts pending. Admins approve or reject applications; rejection needs a reason. Pending/rejected providers can check their own application status and history. Only approved providers can manage vehicles or receive bookings.

### Updating provider information

Keep each submitted application as a fixed version. Changes require a new submission; rejected providers can resubmit. Allow one pending version at a time.

For example, an approved provider submits a new address. Keep showing the approved address during review. Rejection keeps the old address; approval switches to the new one.

## Vehicles (FR-12)

Each vehicle belongs to one provider and has:

- Unique VIN
- Model, transmission, fuel type and seating capacity
- Pickup branch
- Daily rental price

Approved providers can create/view their vehicles and change branch/rate. Identity and specifications stay fixed. They cannot access or change another provider's vehicles.

Deactivation stops new bookings and keeps existing ones. Approved owners can reactivate vehicles. Activation and the offering period are separate controls.

Public provider details include name, address and telephone (FR-03).

### When is a vehicle available?

All of these must hold for the requested dates:

- Provider is approved and vehicle is active.
- The whole rental fits inside the vehicle's offering period.
- No confirmed booking overlaps.

The offering period has a required start and optional end. Changes must retain upcoming/ongoing bookings.

Get occupied dates from Booking records; do not duplicate the list inside Vehicle.

Note: a search result does not reserve the car. Recheck when saving, including simultaneous requests from different customers.

## Booking dates and limits (FR-03)

One booking selects one vehicle and its provider. Use Thailand calendar dates, including both start and due dates.

- Start today or later.
- Rent for 1–30 days; same-day counts as one day.
- A customer can have three upcoming/ongoing bookings at most.
- Cancelled/completed bookings do not count.
- Completion happens after the due date, without a manual return.

For example, December 5–7 occupies three days. The next booking for that car can start on December 8, not December 7.

One customer can book different cars for overlapping dates, within the cap.

## Price

The server calculates the price in THB:

```text
Total price = booked daily rate × rental days
```

Store money as integer satang. Keep the booked vehicle details, branch and rate. Listing changes apply to new bookings.

For example, a booking at 1,000 baht/day keeps that rate after the provider raises it to 1,200. Editing its dates also keeps 1,000 baht/day and recalculates the total.

## Viewing and changing bookings

Customers can view their bookings (FR-04). Before the original start, they can edit dates (FR-05) or cancel (FR-06). Date edits keep the customer, provider, vehicle, branch and rate. Recheck dates, eligibility, cap and availability.

Admins can view any booking (FR-07) and edit dates under the same cutoff (FR-08). They can also cancel ongoing rentals in an emergency (FR-09).

Approved providers have read-only access to own-vehicle bookings (FR-13). Include booking ID, current customer name/contact, booked vehicle details, branch, dates and total. Providers cannot edit/cancel bookings.

Cancellation retains the record and frees occupied dates and a counted slot once. Repeating it has no further effect. Completed bookings stay historical; cancelled bookings cannot be restored.

## Suspension and reactivation (FR-14)

Admin suspension needs a reason. It blocks protected provider reads/writes, including existing sessions, but allows logout. Remove the provider's vehicles from public discovery and cancel all upcoming/ongoing bookings. Keep completed/already-cancelled records unchanged.

Suspension and cancellations must succeed together or roll back together. A simultaneous booking request cannot leave an active booking with a suspended provider.

An admin can reactivate after resolving the issue, with a resolution note. Cancelled bookings stay cancelled. Approving a profile revision must not clear suspension.

## Quality and scope

Build REST APIs with Atlas (CON-01, CON-03). Keep account, application and booking data confidential (NFR-02). Check permissions on lists and individual records, validate input, derive ownership/prices server-side and return safe, consistent application errors. Parser and framework failures also return safe JSON errors (D-54).

Target responses within three seconds (NFR-03). Check behavior with automated tests and a repeatable Postman Runner/Newman demo (NFR-04). Concurrent requests must still respect the cap, availability and suspension rules.

Out of scope:

- Frontend (CON-02)
- Payments, fees and refunds
- File uploads
- Password recovery and email verification
- Customer reviews and notifications
- Separate branch management

## Project delivery

Both partners write code and documentation and record their actual contributions.

Deliver:

- Requirements, use cases, sequence diagrams and UML Profile for API.
- An explanation of changes from the taught implementation.
- Work allocation and the GitHub link.
- A Postman Runner/Newman demo in a presentation of at most seven minutes, plus up to three minutes of questions.

Confirm the API-diagram notation, AI disclosure and extra-credit/video expectations in [open decisions](decisions.md#open-decisions).
