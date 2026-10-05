# HMS Benchmarks — AWS EC2, 20 September 2026

Every number in this folder comes from a real run against the full HMS stack on AWS.
Nothing is estimated, extrapolated or rounded in our favour. The raw k6 summaries and the
host-side metrics for each run are archived verbatim under `results/2026-09-20-aws/`.

## Environment

| | System under test | Load generator |
|---|---|---|
| Instance | AWS EC2 `t3.large` | AWS EC2, 2 vCPU |
| vCPU / RAM | 2 vCPU / 8 GB | 2 vCPU / 3.8 GB |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Role | 9 containers (gateway, 5 microservices, Eureka, PostgreSQL 17, Kafka 3.9) | k6 only |
| Network | same VPC, private IP `10.0.1.86:9000` | same VPC |

Runtime: Java 21 (Temurin 21.0.12), Spring Boot 3.5.5, PostgreSQL 17-alpine,
Apache Kafka 3.9.0 (KRaft), Docker Compose.

Seeded data at benchmark time: 251 users (200 patients, 50 doctors, 1 admin),
72 appointments, 30 medical records, 30 prescriptions, 20 medicines with inventory,
210 notifications. All of it created through the real APIs by `k6/seed/seed.js` —
no rows inserted directly into the database, no hard-coded IDs.

## Headline results

| Run | Rate | Requests | Errors | p95 | p99 | Verdict |
|---|---|---|---|---|---|---|
| step1k | 16.7 req/s | 1,001 | 0 | 15.5 ms | 26.3 ms | PASS |
| step10k | 83.3 req/s | 10,001 | 0 | 13.1 ms | 32.5 ms | PASS |
| step50k (before Kafka fix) | 166.7 req/s | 49,798 | 0 | 151.0 ms | 555.3 ms | 203 dropped |
| **step100k (after Kafka fix)** | **166.7 req/s** | **99,998** | **0** | **20.6 ms** | **64.8 ms** | **PASS** |
| stress ramp 10 → 200 req/s | avg 97 req/s | 87,299 | 0 | 7.8 ms | 15.9 ms | PASS, no knee found |
| peak attempt @ 1000 req/s | 628.6 req/s achieved | 377,165 | 0 | — | — | GENERATOR-LIMITED |

Correctness suites (same stack, same day):

| Suite | Result |
|---|---|
| `access-control.js` — negative authorization | 21 checks passed, 0 failed |
| `slot-conflict.js` — 200 concurrent bookings on one slot | 10 committed, 190 rejected, 0 unexpected, 0 double-bookings |

> The raw console output for the two correctness suites was not archived before the
> instances were torn down; the numbers above are what those runs reported. Both suites
> are in `k6/` and reproduce the same checks on any environment — see "Reproducing" below.

## The finding: a healthcheck was the bottleneck, not the application

At 166 req/s the latency profile looked wrong: median 4.6 ms, but p90 51 ms and p99 555 ms.
A uniform slowdown across *every* endpoint — Profile, Appointment, Pharmacy, Notification
alike — meant the cause was something shared, not one slow service.

`hms-monitor.sh` showed Kafka at **151% CPU** during a test that sends no Kafka messages at
all, while NotificationMS (its only consumer) sat at 2.5%. Thread-level `top` inside the
container showed the broker itself was idle: its threads had accumulated only seconds of CPU
time.

The cause was in `docker-compose.yml`:

```yaml
healthcheck:
  test: kafka-broker-api-versions.sh --bootstrap-server localhost:29092
  interval: 10s
```

`kafka-broker-api-versions.sh` is a Java program, so Docker started a **fresh JVM inside the
Kafka container every 10 seconds**, burning 1–2 cores for 1–3 s each time. On a 2-vCPU host
that is 10–20% of wall-clock time spent competing with the application — which is exactly
where the p90 jump came from. Corroborating evidence: Kafka's thread count oscillated between
98 and 119, and its container CPU alternated between ~1% and ~150%.

Replacing it with a plain TCP port probe (no JVM, no measurable CPU):

```yaml
test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/29092"]
```

| Metric (same 166.7 req/s) | Before | After |
|---|---|---|
| p90 | 51.0 ms | 11.5 ms |
| p95 | 151.0 ms | 20.6 ms |
| **p99** | **555.3 ms** | **64.8 ms** |
| Max | 1239 ms | 487 ms |
| Dropped iterations | 203 | 3 |
| Peak VUs needed | 95 / 118 | 26 / 36 |
| Kafka container CPU | up to 151% | 1–5% |

An 8.5× p99 improvement, over a test twice as long, with zero application code changed.

## What limits the system next

Measured at the 628 req/s peak (`results/2026-09-20-aws/07-host-metrics-peak-628rps.txt`):

- **Host CPU** averaged 58.5% with peaks at 99.9% — roughly 1.9 ms of CPU per request.
- **The gateway** is the heaviest single component (40.7% avg, 91.5% peak), then
  AppointmentMS (24.9% / 79.3%) and ProfileMS (17.0% / 67.5%).
- **PostgreSQL was not the bottleneck**: 8.9% avg CPU, and at most 1 query active.
- **Connection pools were**: HikariCP showed 10/10 connections held with 7 threads queued on
  AppointmentMS, and 9/10 with 9 queued on ProfileMS — *while the database sat idle*. That
  pattern points at Spring's `open-in-view` default, which holds a connection for the whole
  request rather than just the query, capping concurrency at pool size regardless of DB load.
  This is documented as the next ceiling, not yet changed.

## Honest limits of these numbers

- The 628 req/s peak run is **generator-limited**: the k6 box hit 99% CPU and exhausted its
  400-VU pool, so its latency figures include queueing on the generator side and must not be
  read as HMS latency. The suite flags this automatically and refuses to report such a run as
  system capacity.
- The true breaking point of the stack is therefore **above 628 req/s and not yet measured** —
  it needs a larger load generator.
- `t3.large` is a burstable instance. Long runs may be affected by CPU credit throttling, which
  is not visible from inside the instance.
- The dataset is small (200 patients). These runs prove **request throughput**, not behaviour
  over large data volumes.

## Reproducing

```bash
# 1. bring the stack up
docker compose up -d

# 2. seed realistic data through the public APIs (no direct DB writes)
BASE_URL=http://localhost:9000 node k6/seed/seed.js

# 3. correctness suites (fast, ~1 min each)
cd k6
BASE_URL=http://localhost:9000 ./run.sh access-control.js
BASE_URL=http://localhost:9000 ./run.sh slot-conflict.js

# 4. load, stepped — move up only when the previous step passes cleanly
PHASE=step1k   BASE_URL=http://localhost:9000 ./run.sh api-load.js
PHASE=step10k  BASE_URL=http://localhost:9000 ./run.sh api-load.js
PHASE=step100k BASE_URL=http://localhost:9000 ./run.sh api-load.js

# 5. on the host running HMS, capture per-container metrics during the run
./k6/hms-monitor.sh          # Ctrl-C when the run ends -> peaks.txt
```

`run.sh` measures the load generator itself (CPU, RSS, host CPU) and marks a run
GENERATOR-LIMITED when the generator saturates, so a benchmark can never flatter the system
by accident. Full documentation of the suite is in `k6/README.md`.

## Files

| File | What it is |
|---|---|
| `results/2026-09-20-aws/01-step1k-cold-start.txt` | First run after container start — shows the NotificationMS cold-start artifact |
| `results/2026-09-20-aws/02-step1k-warm.txt` | Same test, service warm — clean pass |
| `results/2026-09-20-aws/03-step10k.txt` | 83 req/s, clean pass |
| `results/2026-09-20-aws/04-step50k-before-kafka-fix.txt` | The degraded run that started the investigation |
| `results/2026-09-20-aws/05-step100k-after-kafka-fix.txt` | 100k requests, 0 errors, p99 64.8 ms |
| `results/2026-09-20-aws/06-stress-ramp.txt` | 10 → 200 req/s ramp, no knee found |
| `results/2026-09-20-aws/07-peak-628rps-generator-limited.txt` | Peak attempt, correctly flagged as generator-limited |
| `results/2026-09-20-aws/07-host-metrics-peak-628rps.txt` | Container/host CPU, Postgres and HikariCP during the peak run |
| `results/2026-09-20-aws/08-host-metrics-step100k.txt` | Host metrics showing Kafka back at 1–5% after the fix |
| `results/2026-09-20-aws/09-environment.txt` | Instance type, versions, seeded row counts |
