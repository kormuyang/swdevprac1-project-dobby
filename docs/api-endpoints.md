# API endpoint inventory

Generated from `contracts/openapi.json`; do not maintain endpoint shapes separately. Base path: `/api/v1`. This is a design contract, not an implementation.

| Method | Path | Operation | Roles | Owner |
| --- | --- | --- | --- | --- |
| GET | `/health` | `health` | public | A |
| POST | `/auth/register` | `registerCustomer` | public | A |
| POST | `/auth/register-company` | `registerCompany` | public | A |
| POST | `/auth/login` | `login` | public | A |
| POST | `/auth/logout` | `logout` | user, company, admin | A |
| GET | `/auth/me` | `getMe` | user, company, admin | A |
| GET | `/providers` | `listProviders` | public | B |
| GET | `/providers/{providerId}` | `getProvider` | public | B |
| GET | `/vehicles` | `listVehicles` | public | B |
| GET | `/vehicles/{vehicleId}` | `getVehicle` | public | B |
| GET | `/company/profile` | `getOwnProvider` | company | A |
| GET | `/company/applications` | `listOwnApplications` | company | A |
| POST | `/company/applications` | `submitApplication` | company | A |
| GET | `/company/applications/{applicationId}` | `getOwnApplication` | company | A |
| GET | `/company/vehicles` | `listOwnVehicles` | company | B |
| POST | `/company/vehicles` | `createVehicle` | company | B |
| GET | `/company/vehicles/{vehicleId}` | `getOwnVehicle` | company | B |
| PATCH | `/company/vehicles/{vehicleId}` | `updateVehicle` | company | B |
| PATCH | `/company/vehicles/{vehicleId}/availability` | `updateAvailability` | company | B |
| PATCH | `/company/vehicles/{vehicleId}/activation` | `setVehicleActivation` | company | B |
| GET | `/bookings` | `listBookings` | user, admin | B |
| POST | `/bookings` | `createBooking` | user | B |
| GET | `/bookings/{bookingId}` | `getBooking` | user, admin | B |
| PATCH | `/bookings/{bookingId}` | `updateBookingDates` | user, admin | B |
| DELETE | `/bookings/{bookingId}` | `cancelBooking` | user, admin | B |
| GET | `/company/bookings` | `listCompanyBookings` | company | B |
| GET | `/company/bookings/{bookingId}` | `getCompanyBooking` | company | B |
| GET | `/admin/providers` | `listAdminProviders` | admin | A |
| GET | `/admin/providers/{providerId}` | `getAdminProvider` | admin | A |
| GET | `/admin/applications` | `listAdminApplications` | admin | A |
| GET | `/admin/applications/{applicationId}` | `getAdminApplication` | admin | A |
| POST | `/admin/applications/{applicationId}/review` | `reviewApplication` | admin | A |
| POST | `/admin/providers/{providerId}/suspend` | `suspendProvider` | admin | A |
| POST | `/admin/providers/{providerId}/reactivate` | `reactivateProvider` | admin | A |
