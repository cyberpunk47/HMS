# HMS API contract (benchmark reference)

Derived from the controllers, DTOs, services and Feign clients in `backend/` (not guessed).
At runtime the same contract is available from Swagger/OpenAPI once `SWAGGER_ENABLED=true`
(see "Swagger" below). All paths are reached **through the Gateway (`:9000`)**.

## Cross-cutting behaviour

| Topic | Behaviour (source) |
|---|---|
| Auth | Gateway `TokenFilter`: every path except `/user(s)/login` and `/user(s)/register` needs `Authorization: Bearer <JWT>`. Missing/invalid/expired token or a token signed with another environment's secret → **401**. The Gateway strips any client-sent `X-Secret-Key`, `X-User-Id`, `X-User-Role`, `X-Profile-Id` and sets them from the verified token. |
| Access control | `GatewayMS/.../security/AccessPolicy.java` (fail-closed: unlisted paths → **403**). ADMIN: everything. PATIENT: only own patient id; doctor directory + free slots; book/cancel own appointments. DOCTOR: own doctor id; patient data only for patients who have an appointment with them (checked against AppointmentMS `/appointment/internal/**`, which is never reachable from outside); reports only for own appointments; pharmacy medicines. Body ownership (booking, profile update, report create/update) is re-checked in the owning service → **403**. |
| Service security | Every service's `SecurityConfig` allows only requests carrying `X-Secret-Key: SECRET` (so only Gateway/Feign traffic). Requests without `X-User-Role` are internal service-to-service calls. |
| JWT | HS512 signed with **`JWT_SECRET`** (per environment, ≥ 64 bytes base64; UserMS and Gateway refuse to start without it). Claims `id, email, role, name, profileId`, **TTL 5 h**. `profileId` = patient/doctor profile id (null for ADMIN). ADMIN accounts can self-register only while no admin exists; afterwards only an admin (token sent with `/users/register`) can create one. |
| Errors | 401 / 403 as above. `HmsException` → **HTTP 500** `{errorMessage, errorCode: 500, timestamp}` (message from `application.properties`). Bean validation → **400**. Anything else → 500 `"Some error occurred"`. Business rejections (duplicate e-mail, slot taken, out of stock...) are therefore HTTP 500 with a specific `errorMessage`. |
| Date/time | `LocalDateTime` as `YYYY-MM-DDTHH:mm:ss`, no zone. Appointment times are wall-clock time in `hms.business-timezone` (default `Asia/Kolkata`). `LocalDate` as `YYYY-MM-DD`. |

## UserMS (`/user/**` and `/users/**`, port 8082)

| Method & path | Body / params | Success | Notes |
|---|---|---|---|
| POST `/users/register` | `UserDTO {name*, email* (valid), password* (8-15, digit, lower, upper, special), role: PATIENT\|DOCTOR\|ADMIN}` | 201 `{message, profileId}` | BCrypt encode; Feign → ProfileMS `/profile/{patient\|doctor}/add` creates the profile. Duplicate e-mail → 500 "User already exists." |
| POST `/users/login` | `{email, password}` | 200 plain-text JWT | AuthenticationManager (DaoAuthenticationProvider + BCrypt). Wrong credentials / unknown user → 500 "Invalid credentials." |
| GET `/users/getProfile/{userId}` | – | 200 `Long` profile picture id | own user id only (admin: any) |
| GET `/users/getRegistrationCounts` | – | 200 `{patientCounts[], doctorCounts[]}` | |
| GET `/users/test` | – | 200 "Test" | |

## ProfileMS (`/profile/**`, port 9100)

| Method & path | Body / params | Success |
|---|---|---|
| POST `/profile/patient/add`, `/profile/doctor/add` | internal (called by UserMS) | 201 id |
| GET `/profile/patient/get/{id}` | – | 200 `PatientDTO {id,name,email,dob,profilePictureId,phone,address,aadharNo,bloodGroup,gender,allergies,chronicDesease}` |
| PUT `/profile/patient/update` | full `PatientDTO` (replaces all fields; `aadharNo` unique; `allergies`/`chronicDesease` stored by the UI as JSON-array strings) | 200 `PatientDTO` |
| GET `/profile/patient/getAll` | – | 200 `PatientDTO[]` |
| GET `/profile/patient/exists/{id}`, `/getProfileId/{id}` | – | 200 |
| GET `/profile/patient/getPatientsById?ids=1,2` | – | 200 `[{id,name}]` |
| GET `/profile/patient/getPatientsDetailsByIds?ids=1,2` | – | 200 `PatientDTO[]` |
| GET `/profile/doctor/get/{id}` | – | 200 `DoctorDTO {id,name,email,dob,profilePictureId,phone,address,licenseNo,gender,specialization,department,totalExp}` |
| PUT `/profile/doctor/update` | full `DoctorDTO` (`licenseNo` unique) | 200 `DoctorDTO` |
| GET `/profile/doctor/dropdowns` | – | 200 `[{id,name}]` (all doctors) |
| GET `/profile/doctor/getAll` | – | 200 `DoctorDTO[]` |
| GET `/profile/doctor/getDoctorsById?ids=` | – | 200 `[{id,name}]` |
| GET `/profile/doctor/getDoctorsDetailsByIds?ids=` | – | 200 `DoctorDTO[]` — **new** (batch lookup for the admin appointments page) |

## AppointmentMS (`/appointment/**`, port 9200)

| Method & path | Body / params | Success | Rules |
|---|---|---|---|
| POST `/appointment/schedule` | `{doctorId*, patientId*, appointmentTime*, reason, notes}` | 201 appointment id | Feign `getDoctorById` + `getPatientById`; time must be in the future (business zone); **15-minute rule**: rejected if the same doctor *or* the same patient has a SCHEDULED/COMPLETED appointment less than 15 min before/after (exactly 15 min apart is allowed; CANCELLED/EXPIRED free the slot). Concurrent bookings are serialised per doctor/patient (PostgreSQL advisory lock). Publishes `APPOINTMENT_CREATED` to Kafka. |
| PUT `/appointment/cancel/{id}` | – | 200 "Appointment Cancelled" | not already cancelled, not in the past; Kafka `APPOINTMENT_CANCELLED` |
| GET `/appointment/get/{id}` | – | 200 `AppointmentDTO` | |
| GET `/appointment/get/details/{id}` | – | 200 `AppointmentDetails {id, patientId, patientName, patientEmail, patientPhone, doctorId, doctorName, appointmentTime, status, reason, notes}` | 2 Feign calls |
| GET `/appointment/getAllByPatient/{patientId}` | – | 200 `AppointmentDetails[]` (doctorName filled) | 1 batched Feign call |
| GET `/appointment/getAllByDoctor/{doctorId}` | – | 200 `AppointmentDetails[]` (patient name/email/phone filled) | 1 batched Feign call |
| GET `/appointment/today` | – | 200 `AppointmentDetails[]` | |
| GET `/appointment/all?page&size&status&from&to&doctorId&patientId&sort=asc\|desc` | all optional; `size` ≤ 100 | 200 `{content: AdminAppointmentDetails[], page, size, totalElements, totalPages}` | **new** (admin page): patient + doctor details, `reportAvailable`, `prescriptionId` |
| GET `/appointment/all/status-counts` | – | 200 `[{status, count}]` | **new** |
| GET `/appointment/doctor/{doctorId}/booked-slots?date=YYYY-MM-DD` | – | 200 `LocalDateTime[]` of active appointments (±15 min around the day) | **new** (slot picker) |
| GET `/appointment/countByPatient/{id}`, `/countByDoctor/{id}`, `/visitCount` | – | 200 `[{month, count}]` | current year |
| GET `/appointment/countReasonByPatient/{id}`, `/countReasonByDoctor/{id}`, `/countReasons` | – | 200 `[{reason, count}]` | |
| GET `/appointment/getMedicinesByPatient/{id}` | – | 200 `MedicineDTO[]` | |
| GET `/appointment/patients/doctor/{doctorId}` | – | 200 `Long[]` | |
| GET `/appointment/patients/doctor/{doctorId}/metrics` | – | 200 `[{month, count}]` | |
| GET `/appointment/patients/doctor/{doctorId}/dropdown` | – | 200 `PatientDTO[]` | |
| POST `/appointment/report/create` | `ApRecordDTO {appointmentId*, symptoms[], diagnosis, tests[], notes, referral, followUpDate, prescription: {notes, medicines: [{name, medicineId?, dosage, frequency, duration, route, type, instructions}]}}` | 201 record id | One report per appointment. Completes the appointment first (must be SCHEDULED and not more than 1 h in the future); patient/doctor ids are taken from the appointment; the whole operation now rolls back if any step fails. |
| PUT `/appointment/report/update` | `ApRecordDTO` with `id` | 200 | |
| GET `/appointment/report/getByAppointmentId/{id}`, `/getDetailsByAppointmentId/{id}` (incl. prescription + medicines), `/getById/{recordId}` | – | 200 `ApRecordDTO` | |
| GET `/appointment/report/getRecordsByPatientId/{patientId}` | – | 200 `RecordDetails[]` | returns `[]` for patients without records (previously 500) |
| GET `/appointment/report/isRecordExists/{appointmentId}` | – | 200 boolean | |
| GET `/appointment/report/getPrescriptionsByPatientId/{patientId}` | – | 200 `PrescriptionDetails[]` with medicines | returns `[]` when none (previously 500) |
| GET `/appointment/report/getAllPrescriptions` | – | 200 `PrescriptionDetails[]` (no medicines) | unbounded list (all prescriptions) |
| GET `/appointment/report/getMedicinesByPrescriptionId/{id}` | – | 200 `MedicineDTO[]` | |
| `/appointment/prescription/**` | create, update, get/{id}, get/appointment/{id}, patient/{id}, all, medicines/{id} | | same services as above |

## PharmacyMS (`/pharmacy/**`, port 9300)

| Method & path | Body | Success | Rules |
|---|---|---|---|
| POST `/pharmacy/medicine/add` | `MedicineDTO {name, dosage, description, category (enum MedicineCategory), type (enum MedicineType), manufacturer, unitPrice, notes}` | **200** id | name+dosage unique (case-insensitive); stock starts at 0 |
| GET `/pharmacy/medicine/get/{id}`, `/getAll` | – | 200 | |
| PUT `/pharmacy/medicine/update` | `MedicineDTO` with id | 200 `{message}` | |
| POST `/pharmacy/inventory/add` | `{medicineId, batchNo, quantity, expiryDate}` | 201 batch | adds `quantity` to medicine stock, status ACTIVE |
| PUT `/pharmacy/inventory/update`, GET `/get/{id}`, `/getAll` | | | |
| POST `/pharmacy/sales/create` | `SaleRequest {prescriptionId?, buyerName, buyerContact, totalAmount, saleItems: [{medicineId, quantity, unitPrice}]}` | 201 sale id | FIFO by expiry over ACTIVE batches (rows locked); OUT_OF_STOCK / INSUFFICIENT_STOCK; a `prescriptionId` can be sold once (SALES_ALREADY_EXISTS) |
| PUT `/pharmacy/sales/update`, GET `/get/{id}`, `/getAll`, `/getSaleItems/{saleId}` | | | |

**PharmacyMS ↔ AppointmentMS relationship:** PharmacyMS has **no** Feign/WebClient client and never
calls AppointmentMS. The link is made by the frontend (admin *Sales* page): it loads
`/appointment/report/getAllPrescriptions`, then `/getMedicinesByPrescriptionId/{id}`; each prescribed
medicine's `medicineId` is a **PharmacyMS medicine id** (chosen from `/pharmacy/medicine/getAll` when the
doctor writes the report; `null` for "Other"). The sale stores `prescriptionId` without validating it.
A valid pharmacy workflow therefore needs: a completed appointment → report with prescription whose
medicines reference existing pharmacy medicines → stock (inventory batches) → sale.

## NotificationMS (`/notification/**`, port 9101)

| GET `/notification/patient/{patientId}`, `/notification/doctor/{doctorId}` | 200 `NotificationDTO[]` (newest first) |
|---|---|

Notifications are created asynchronously from Kafka topic `hms.appointment-events`
(CREATED / CANCELLED / COMPLETED / RESCHEDULED / EXPIRED), 2 rows per event (patient + doctor).
NotificationMS has no Spring Security (it relies on the Gateway).

## Swagger / OpenAPI (temporary)

`springdoc-openapi-starter-webmvc-ui` was added to UserMS, ProfileMS, AppointmentMS and PharmacyMS.
It is **disabled unless `SWAGGER_ENABLED=true`** (then `/v3/api-docs` and `/swagger-ui.html` are the
only paths reachable without the internal secret):

```bash
SWAGGER_ENABLED=true docker compose up -d --build
# UserMS http://localhost:8082/swagger-ui.html   ProfileMS :9100   AppointmentMS :9200   PharmacyMS :9300
curl -s http://localhost:9200/v3/api-docs > docs/openapi-appointment.json
```

To remove later: delete the springdoc dependency block from the 4 `pom.xml` files, the
`springdoc.*` lines from their `application.properties`, and the `isSwaggerPath` matcher from
their `SecurityConfig`. NotificationMS (Spring Boot 4) was left without Swagger; its 2 GET endpoints
are documented above.
