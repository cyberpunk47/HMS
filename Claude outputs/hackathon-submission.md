# WeMakeDevs "First Commit" — Submission answers (copy-paste ready)

Solo submission. Team code SBT444 ("hopeless"). All numbers below are from real runs on AWS EC2 on 20 Sep 2026 — nothing is estimated or rounded up.

---

## Quick fields

| Field | Value |
|---|---|
| Team leader's WeMakeDevs username | `yasir_hameed` |
| Team leader's GitHub | https://github.com/cyberpunk47 |
| Team leader's LinkedIn | https://www.linkedin.com/in/yasirh47/ |
| Team leader's resume | *(upload the PDF to Google Drive, set "Anyone with the link", paste that link)* |
| Project title | **HMS — A Hospital Management System Built and Benchmarked Like Production** |
| GitHub link to project | https://github.com/cyberpunk47/HMS |
| Deployed link | *(your Vercel frontend URL — leave blank if the EC2 backend is torn down)* |
| YouTube video demo | *(unlisted link — script below)* |
| Track | *(pick from the event's tracks; tell me the options and I'll match the wording)* |

**Title alternatives** if you want something shorter: "HMS — Event-Driven Hospital Management on AWS", or "HMS: 6 Microservices, 100k Requests, 0 Errors".

---

## What does your project do? *(problem + who it's for)*

HMS is a hospital management system built as six Spring Boot microservices — Users, Profiles, Appointments, Pharmacy, Notifications and an API Gateway — with Eureka service discovery, Kafka for event-driven notifications and a separate PostgreSQL database per service.

**The problem.** Small and mid-size hospitals run on disconnected tools: appointments in one register, prescriptions on paper, pharmacy stock in a spreadsheet. Two things break first, and both hurt patients. Double-booking: two patients get the same doctor at the same time because nothing enforces the slot. And access to records: everyone with a login can see everything, because there is no per-record ownership check.

**What HMS does about it.**

- **Appointments that cannot double-book.** A doctor cannot be booked twice within 15 minutes. The rule is enforced with PostgreSQL advisory transaction locks, not with a check-then-insert that races. Under test, 200 simultaneous booking attempts on one slot committed exactly 10 and rejected 190 cleanly — zero conflicts.
- **Authorization that fails closed.** The gateway verifies the JWT, strips any client-supplied identity headers, re-issues its own, and checks not just the role but the actual doctor–patient relationship before letting a request through. If the relationship service is unreachable, the request is denied (503), never allowed through. A 21-case negative-authorization suite — patient token on doctor endpoints, doctor reading an unrelated patient, self-registering as admin — passes 21/21.
- **Clinical records end to end.** Doctors write visit reports and prescriptions; patients see their own medical history and reports; the pharmacy dispenses against prescriptions with batch-level stock, protected by pessimistic row locks so two counters cannot sell the same last strip.
- **Notifications without coupling.** Appointment events go to Kafka; NotificationMS consumes them independently, so a slow notification path never slows down booking.

**Who it's for.** Clinics and small hospitals that need appointments, records, prescriptions and pharmacy stock in one system — and, for the judges, a reference for how to build and actually prove a microservice backend rather than assuming it works.

**What makes it different: it is measured, not claimed.** The repo ships a full k6 benchmark suite (load, auth, booking-race, access-control, pharmacy) with guard rails that detect when the load generator itself is the bottleneck and refuse to report those runs as system capacity. Results on a single 2-vCPU EC2 instance:

| Run | Result |
|---|---|
| 10-minute soak at 166 req/s | 100,000 requests, **0 errors**, p95 **20.6 ms**, p99 **64.8 ms** |
| Peak sustained | **628 req/s**, 377,165 requests, **0 errors** |
| Booking race, 200 concurrent | 10 committed / 190 rejected / **0 double-bookings** |
| Access-control suite | **21/21 passed** |

The most interesting finding came from that suite. At 166 req/s the median was 4.6 ms but the 99th percentile was 555 ms — a classic "most requests fine, some stall" pattern. Per-container CPU showed Kafka at 150% while it was serving no traffic at all. The cause was the Kafka container's Docker healthcheck: it ran a Kafka CLI tool, which starts a fresh JVM **every 10 seconds**, burning ~1.5 cores for 1–3 s each time. Replacing it with a plain TCP port probe cut **p99 from 555 ms to 64.8 ms — 8.5×** — and dropped requests from 203 to 3, with no application code changed.

---

## How did you use AWS in your project?

**Ship it — AWS services used**

- **Amazon EC2** — the entire stack runs on EC2. One `t3.large` (2 vCPU, 8 GB) hosts all 9 containers: gateway, 5 microservices, Eureka, PostgreSQL 17 and Kafka 3.9 under Docker Compose. A **second, dedicated EC2 instance** runs the k6 load generator, so the load generator never competes with the system under test for CPU — the single most common way self-reported benchmarks get inflated.
- **Amazon VPC, subnets and security groups** — both instances sit in the same VPC. The benchmark traffic goes generator → gateway over the **private IP** (`10.0.1.86:9000`), so measurements are not polluted by internet round-trips; median latency stayed at 3–5 ms. Security groups expose only port 9000 to the frontend origin and SSH to my IP; every internal service port is closed to the outside.
- **Elastic IP** — a stable public address for the API so the Vercel-hosted React frontend can reach the backend through a rewrite rule without rebuilding on every restart.
- **Amazon EBS (gp3)** — persistent volumes for PostgreSQL data and Kafka logs across container restarts.
- **EC2 instance metadata (IMDSv2)** — the benchmark capture script records instance type and vCPU count from the metadata endpoint, so every result file states the exact hardware it was produced on.
- **Terraform (AWS provider)** — the VPC, subnets, security groups, key pairs and both instances are defined as code in `terraform/`, so the whole environment is reproducible and destroyable in one command.

**Build it — open source stack**

The application is built entirely on open source running on AWS: **Spring Boot 3.5 / Java 21, PostgreSQL 17, Apache Kafka 3.9 (KRaft mode, no ZooKeeper), Netflix Eureka, Docker and Docker Compose, k6 for load testing, and Terraform** for provisioning. Kafka and PostgreSQL run as containers on EC2 rather than as managed services, which is what made the Kafka healthcheck problem visible in the first place — a managed broker would have hidden that CPU inside someone else's bill and I'd never have found it.

> **Gap to close before you submit (be honest about this one):** if the judges specifically want the *AWS* open source stack named, the fastest truthful addition is switching the service Dockerfiles' base image from `eclipse-temurin:21` to **`amazoncorretto:21`** — Amazon Corretto is AWS's own open-source OpenJDK distribution. It's a one-line change per Dockerfile and a rebuild. Do it only if you actually rebuild and run it; don't claim it otherwise.

---

## Team leader's contributions *(solo)*

Sole developer — designed, built, deployed and benchmarked the entire system.

- **Architecture:** 6 Spring Boot microservices, database-per-service PostgreSQL, Eureka discovery, Feign inter-service calls, Kafka event pipeline, Spring Cloud Gateway.
- **Security:** JWT issuance and verification, gateway-level identity header injection with client-header stripping, fail-closed relationship-aware authorization policy, per-environment secrets, plus the 21-case negative-authorization test suite.
- **Correctness under concurrency:** 15-minute doctor slot rule with PostgreSQL advisory locks, pharmacy stock deduction under pessimistic row locks, transactional rollback guarantees; verified with a 200-VU booking-race test.
- **Frontend:** React + Vite app — patient, doctor and admin dashboards, slot picker, medical history, prescription and report views, admin appointments console.
- **Infrastructure:** Docker Compose for 9 containers, a separate AWS-profile compose overlay, Terraform-provisioned VPC and EC2, deployment on EC2 with the frontend on Vercel.
- **Performance engineering:** built a k6 benchmark suite with generator-saturation guard rails and a host-side monitor (per-container CPU, host CPU, `pg_stat_activity`, HikariCP metrics via Actuator); ran a stepped capacity plan from 1k to 100k requests; found and fixed the Kafka healthcheck regression (p99 555 ms → 64.8 ms); isolated open-session-in-view as the next concurrency ceiling using pool telemetry (10/10 connections held, 7 threads queued, database idle).

---

## What could be better about the AWS services you used?

Be specific and name services — this is what earns marks.

**Amazon EC2 — burstable (T-series) CPU credits are invisible at the moment they matter.** I benchmarked on a `t3.large`. Nothing in the instance's default monitoring tells you, while a test is running, that you are about to exhaust CPU credits and get throttled — `CPUCreditBalance` exists in CloudWatch but is not surfaced anywhere near where you actually watch load. For a benchmark this is dangerous: a run can silently degrade and look like an application regression. A warning event, or a flag in the console when an instance is running near credit exhaustion, would have saved me real debugging time.

**Amazon EC2 + CloudWatch — no memory metrics by default.** CPU, disk and network are there out of the box, but memory is not, unless you install the CloudWatch agent. For a JVM workload, where heap pressure is the first thing you suspect, that is the one metric you want first. I ended up writing my own sampler that scrapes `docker stats` and `/proc/meminfo` every 5 seconds — which worked, but a per-instance memory metric should not require an agent install in 2026.

**IMDSv2 — the token handshake breaks simple scripting.** Fetching the instance type now needs a `PUT` to get a token and then a `GET` with that token as a header. It is more secure and I understand why, but half the documentation and blog examples still show the one-line IMDSv1 `curl`, so you copy a snippet, get an empty response, and have to work out why. A clearer "IMDSv1 is disabled on this instance" error instead of a silent empty body would make this a five-second fix instead of a five-minute one.

**Elastic IP billing is a trap for short-lived projects.** An Elastic IP is free while attached and billed while it is not. When you tear down instances for a hackathon project — which is exactly the workflow this event encourages — the EIP is easy to leave behind and quietly bills you. A prompt in the console when the last associated instance is terminated ("this Elastic IP is now unattached and will be charged") would prevent a lot of surprise student bills.

**Reaching a private-subnet instance is heavier than it should be for two-instance setups.** Getting to an instance with no public IP means a bastion host or Session Manager, and Session Manager needs an IAM role plus VPC endpoints. That is the right design at scale, but for a two-instance benchmark it is a lot of setup before you can type one command.

---

## What did you like about the AWS services you used?

**Amazon EC2 + VPC private networking is what made the benchmark trustworthy.** Putting the k6 generator and the application on two instances in the same VPC and driving traffic over the private IP gave me a 3–5 ms median with almost no variance. That stability is what let me see a 555 ms p99 as an anomaly worth chasing rather than noise — and that chase is how I found the Kafka healthcheck bug. On a laptop or across the public internet, that signal would have been buried.

**Security groups that reference other security groups.** Being able to say "the gateway's port 9000 accepts traffic from the generator's security group" rather than hardcoding IPs meant I could rebuild instances without touching the rules. It is a small thing that removed a whole class of "why can't these two talk" debugging.

**Per-second billing made the experiment loop genuinely cheap.** I ran a stepped capacity plan — 1k, 10k, 50k, 100k requests, then a 15-minute ramp and a 10-minute soak, plus reruns after every fix. Being billed per second on two t3 instances meant an entire afternoon of load testing cost less than lunch, so I could afford to rerun the whole plan after changing one line of the Kafka healthcheck instead of guessing whether the fix worked.

**Changing instance size is a stop, a dropdown and a start.** When the data showed that 2 vCPUs were the ceiling, resizing was a two-minute operation rather than a migration. That turns "how much hardware does this need?" from a design argument into a measurement.

**The Terraform AWS provider docs.** Every resource page has a minimal working example at the top. For someone provisioning a VPC, subnets, security groups and instances for the first time, that "copy this, it works, now read why" ordering is the right way round.

---

## 3-minute YouTube demo script

| Time | What to show | What to say |
|---|---|---|
| 0:00–0:25 | Frontend — patient books an appointment | The problem: clinics double-book doctors and leak records. Here's HMS. |
| 0:25–0:50 | Try to book the same doctor 10 minutes later → rejection message | The 15-minute slot rule, enforced in the database with advisory locks, not in the UI. |
| 0:50–1:20 | Architecture diagram | 6 Spring Boot microservices, Eureka, Kafka, database per service, gateway doing JWT and relationship checks. |
| 1:20–1:45 | Terminal — `access-control.js` output, 21/21 passed | Authorization is tested as a suite: a patient token cannot touch doctor endpoints, a doctor cannot read an unrelated patient. |
| 1:45–2:15 | Terminal — `slot-conflict.js`: 10 committed, 190 rejected | 200 simultaneous bookings on one slot. Zero double-bookings. |
| 2:15–2:45 | k6 step100k summary on screen | 100,000 requests on one 2-vCPU EC2 instance, 0 errors, p99 65 ms. AWS: two EC2 instances in one VPC, generator separated so it can't skew results. |
| 2:45–3:00 | The before/after p99 numbers | And the bug I found doing it: a Kafka healthcheck spawning a JVM every 10 seconds. Fixing it cut p99 8.5×. |

Record the terminal parts from the saved result files if the instances are already destroyed — say on camera that these are captured runs, don't re-fake them live.

---

## Before you submit — checklist

- [ ] **Pull the two benchmark tarballs off both EC2 instances** and commit them (or their key files) into the repo under `k6/results/` — once the instances are gone, these are your only proof.
- [ ] Repo is **public**, README has: what it does, architecture diagram, setup steps (`docker compose up`), the benchmark section with these numbers, and how to rerun the k6 suite.
- [ ] `.env` and secrets are **not** committed; `.env.example` is.
- [ ] Commit history is visible and readable — judges are told to look at it.
- [ ] Resume PDF uploaded to Drive, link sharing set to "Anyone with the link".
- [ ] YouTube video unlisted or public, under 3 minutes.
- [ ] Deployed link: if the backend is torn down, either leave it blank or note in the README that the demo is video-only, so a judge isn't met with a dead page.
