# HMS

Hospital Management System built as a full-stack microservice project.

This repository is more than a set of APIs and pages. It is a record of how I learned to move from brute-force code to a system that has separation of concerns, service boundaries, scheduled jobs, API contracts, repositories, DTOs, authentication, deployment configuration, and frontend workflows.

I did not start with the final architecture. I first wrote code that simply made the feature work. After that, I kept coming back to the same code and asking better questions:

- Why is this controller doing too much?
- Why is this service directly depending on data it should not own?
- What happens when an appointment expires and no one manually updates it?
- What happens when pharmacy stock is sold from multiple batches?
- How should one service talk to another service without turning the whole system into one large class?
- How do I make errors understandable instead of only throwing random exceptions?

That process shaped the system.

## What HMS Does

HMS supports the main flows of a hospital management platform:

- User registration and login for patients, doctors, and admins.
- Patient and doctor profile management.
- Appointment scheduling, cancellation, completion, expiry, and reporting.
- Prescription and appointment record management.
- Medicine catalog management.
- Pharmacy inventory batch tracking.
- Sales and sale-item tracking.
- Dashboards for patient, doctor, and admin views.
- Gateway-level authentication and routing.
- Service discovery through Eureka.
- PostgreSQL-backed persistence per service.

## Architecture

The project is structured as a microservice system.

```text
HMS
├── backend
│   ├── Eureka-Server
│   ├── GatewayMS
│   ├── UserMS
│   ├── ProfileMS
│   ├── Appointment
│   └── PharmacyMS
└── frontend
    └── hms
```

### Service Responsibilities

`Eureka-Server` is the service registry. It allows services to discover each other without hardcoding every internal URL.

`GatewayMS` is the API gateway. It routes frontend requests to the correct backend service and applies the token filter before protected routes are reached.

`UserMS` owns authentication, registration, roles, password encoding, JWT generation, and user-to-profile linkage.

`ProfileMS` owns patient and doctor profile data. Other services ask it for profile details instead of duplicating patient and doctor data.

`Appointment` owns appointments, appointment records, prescriptions, appointment analytics, and appointment lifecycle rules.

`PharmacyMS` owns medicines, inventory batches, stock status, sales, and sale items.

The frontend is the user-facing layer for patients, doctors, and admins.

## How The Design Evolved

### First Version: Make It Work

The first version was direct and brute-force. I focused on getting features to run:

- Controllers accepted requests.
- Services saved data.
- Repositories talked to the database.
- Frontend pages called APIs.
- Errors were handled only after the feature started breaking.

This helped me understand the domain. It also exposed the weakness of writing everything in one pass. Once appointments, prescriptions, profiles, inventory, and sales started interacting, the code needed clearer boundaries.

### Second Version: Separate The Layers

The next step was introducing a more disciplined backend shape:

```text
Controller/API -> Service -> Repository -> Entity
              DTOs move data between layers
              Exceptions describe business failures
```

The controllers became thinner. Services started holding business rules. Repositories became responsible only for persistence queries. DTOs stopped raw entities from leaking everywhere.

This was where the codebase became easier to reason about.

### Third Version: Optimize The Business Logic

After the basic services worked, I started optimizing the code that had real business meaning.

Appointment scheduling was improved to check:

- Whether the doctor exists.
- Whether the patient exists.
- Whether the requested appointment time is in the past.
- Whether the doctor already has an appointment at that time.
- Whether the patient already has an appointment at that time.

Inventory sales were improved from simply subtracting a number to selling from valid batches. Pharmacy stock now considers expiry date, quantity, active status, and batch ordering. The logic became closer to how real inventory should behave.

The important learning here was that optimization is not only about performance. Sometimes optimization means making the code match reality better.

## API Design

The API design follows domain boundaries:

- `/users/**` for login, registration, and user-level operations.
- `/profile/**` for patient and doctor profile data.
- `/appointment/**` for scheduling, reports, prescriptions, analytics, and appointment status.
- `/pharmacy/**` for medicine, inventory, and sales workflows.

The gateway routes requests to services through Eureka:

```text
/users/**       -> UserMS
/profile/**     -> ProfileMS
/appointment/** -> AppointmentMS
/pharmacy/**    -> PharmacyMS
```

The API design improved as I learned that endpoints should not just expose database tables. They should express actions in the system. For example, cancelling an appointment is not just an update. It is a business action with rules.

## Services

The service layer became the most important part of the backend.

This is where I learned to keep business rules away from controllers. A controller should not decide if a patient can cancel an appointment. A controller should receive the request and delegate. The service should know the rule.

Examples of service rules:

- A user cannot register with an email that already exists.
- A password must be encoded before persistence.
- A doctor and patient must exist before an appointment is scheduled.
- A completed or cancelled appointment should not be treated like a scheduled one.
- Expired appointment records should be marked automatically.
- Medicine stock should be reduced through inventory batches, not blindly from one number.
- Sale items should track the batch details used to fulfill the sale.

The service layer is where the project changed from CRUD code into application logic.

## Repositories

Repositories started as simple database access files. Later they became more useful because I wrote queries around the questions the system actually needed to answer.

Examples:

- Find appointments by patient.
- Find appointments by doctor.
- Count visits by month.
- Count appointment reasons.
- Find scheduled appointments before the current time.
- Find active inventory batches ordered by expiry date.
- Find expired medicine batches.
- Find sale items by sale id.

I learned that repository methods should not be random. A good repository method usually comes from a real business question.

## Cron Jobs

Scheduled jobs made the system feel more alive because some work should happen without a user pressing a button.

### Appointment Expiry

The appointment service has a scheduled job that runs at the top of every hour:

```java
@Scheduled(cron = "0 0 * * * ?")
```

It finds scheduled appointments whose time has already passed and marks them as expired.

This taught me that status transitions are not always user actions. Some state changes belong to the system clock.

### Pharmacy Expiry

The pharmacy inventory service has a scheduled job that runs every day at 12:10 AM:

```java
@Scheduled(cron = "0 10 0 * * ?")
```

It checks expired medicine batches, removes their stock from the medicine count, and marks the inventory batches as expired.

This was one of the clearer lessons in backend design: data can become wrong even when no API is called. Cron jobs help protect the system from stale state.

## Master And Worker Services

While learning microservices, I first thought about the system in terms of master and slave services. Later, I understood the cleaner language as primary services and worker/domain services.

In this project:

- The gateway acts like the primary entry point.
- Eureka acts like the registry that lets services find each other.
- User, Profile, Appointment, and Pharmacy services own their separate domains.
- Feign clients allow one service to ask another service for only the data it needs.

The key lesson was that one service should not own everything. A service should own its domain and communicate through clear APIs.

## Authentication And Gateway

Authentication is handled through JWT.

The user service validates credentials and returns a token. The gateway checks protected requests before forwarding them. Public login and registration routes are allowed through, while protected routes require a bearer token.

This helped me understand why an API gateway is useful. Without the gateway, every service would repeat the same authentication checks. With the gateway, authentication becomes centralized at the entry point.

## DTOs And Entities

At first, it was tempting to pass entities directly everywhere. That works for small examples, but it becomes messy quickly.

DTOs helped separate:

- What the database stores.
- What the API receives.
- What the API returns.
- What one service sends to another service.

This made the code easier to change because API contracts were not tied directly to JPA entities.

## Error Handling

The project uses custom exceptions and controller advice to make failures more structured.

Instead of letting random runtime errors leak to the client, services throw domain errors like:

- `USER_ALREADY_EXISTS`
- `USER_NOT_FOUND`
- `INVALID_CREDENTIALS`
- `DOCTOR_NOT_FOUND`
- `PATIENT_NOT_FOUND`
- `APPOINTMENT_NOT_FOUND`
- `APPOINTMENT_ALREADY_CANCELLED`
- `INVENTORY_NOT_FOUND`
- `OUT_OF_STOCK`
- `INSUFFICIENT_STOCK`

This taught me that error messages are part of the API design. A frontend can only give useful feedback if the backend reports failures clearly.

## Pharmacy And Inventory Learning

The pharmacy module was one of the strongest learning points in the project.

The brute-force version was simple: add stock, remove stock, save sale.

The better version considers:

- Medicine master records.
- Inventory batches.
- Batch numbers.
- Expiry dates.
- Initial quantity.
- Current quantity.
- Active and expired stock.
- FIFO-style selling from batches that expire first.
- Transaction rollback when stock is insufficient.

The optimized sale flow does not just reduce stock. It finds valid batches, consumes them in order, records the batch trail, and fails safely if the requested quantity cannot be fulfilled.

This is where I learned that backend code has to protect real-world consistency.

## Appointment Learning

Appointments also moved from simple CRUD to real workflow.

An appointment can be:

- Scheduled.
- Cancelled.
- Completed.
- Expired.

The code now checks whether actions are valid for the current status. For example, a cancelled appointment should not be cancelled again, and a future appointment should not be completed too early.

The appointment module also talks to the profile service to enrich appointment data with patient and doctor details. This helped me understand service-to-service communication.

## Deployment

The project includes Render deployment configuration:

- Dockerfiles for backend services.
- `render.yaml` for service and database setup.
- Render-specific Spring profiles.
- PostgreSQL databases per major backend domain.
- Gateway CORS configuration for the frontend.

Deployment forced me to think beyond localhost. Environment variables, service ports, database URLs, and gateway routing became part of the system design.

## Frontend

The frontend is a React application with role-based pages:

- Patient dashboard, appointments, and profile.
- Doctor dashboard, appointments, appointment details, prescriptions, patients, medicines, and profile.
- Admin dashboard, medicine, inventory, sales, patients, and doctors.

The frontend taught me how backend design affects UI work. If the API is unclear, the frontend becomes full of workarounds. If the API gives structured data and clear errors, the frontend becomes easier to build.

## Tech Stack

Backend:

- Java
- Spring Boot
- Spring Cloud Gateway
- Eureka
- OpenFeign
- Spring Security
- JWT
- Spring Data JPA
- PostgreSQL
- Docker
- Render

Frontend:

- React
- TypeScript
- Redux Toolkit
- React Router
- Axios
- Tailwind CSS
- Recharts

## How To Run Locally

Start PostgreSQL and create the required databases:

```text
hms_user_db
hms_profile_db
hms_appointment_db
hms_pharmacy_db
```

Run the backend services in this order:

```text
Eureka-Server
UserMS
ProfileMS
Appointment
PharmacyMS
GatewayMS
```

Run the frontend:

```bash
cd frontend/hms
npm install
npm run dev
```

The local gateway runs on port `9000` by default.

## What I Learned

I learned that building a system is not the same as writing files.

In the beginning, I wrote code to finish features. Later, I started writing code to protect the system from bad states. That shift changed how I thought about every layer.

I learned that:

- Controllers should stay thin.
- Services should own business rules.
- Repositories should answer domain questions.
- DTOs protect API boundaries.
- Cron jobs are necessary when time changes data.
- Gateway routing reduces duplicated security logic.
- Microservices need clear ownership, not just separate folders.
- Optimized code usually comes after the brute-force version teaches you what is wrong.

This project was built through that learning curve. The commit history shows checkpoints, but the real progress was in rewriting unclear code into code that had a reason to exist.

## Current Status

HMS is still evolving. Some parts are polished, and some parts still show the learning process. That is intentional for this repository. It shows the path from first implementation to better system design.

The goal is not only to have a working hospital management system. The goal is to understand how a real codebase grows, breaks, improves, and becomes easier to maintain.
