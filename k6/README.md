# HMS k6 benchmark suite

Every request uses a token that the Gateway access policy allows (own data, public doctor
directory, doctor → own patients, admin → pharmacy). Every test hits the **Gateway** only (`BASE_URL`, e.g. `http://<hms-private-ip>:9000`).
Every id, e-mail and token comes from the seed (`seed/seed.js`), which creates its data through
the real HMS APIs. Nothing is hard-coded or written into the database directly.

```
k6/
  seed/seed.js                 idempotent benchmark seed (Node 18+, no npm deps) -> data/
  seed/cleanup-bench-data.sql  deletes ONLY benchmark rows (appointments/sales/signup users)
  lib/config.js                phases, arrival-rate scenarios, VU sizing
  lib/data.js                  seeded users (SharedArray) + JWT expiry guard
  lib/http.js                  tagged requests + per-endpoint metrics
  lib/slots.js                 collision-free 15-minute slot allocator
  lib/summary.js               target-vs-achieved summary (stdout table + JSON)
  lib/endpoints.js             static endpoint names (metric tags)
  api-load.js           A  API throughput (authenticated GETs)          1 iteration = 1 request
  auth-load.js          B  login only                                    1 iteration = 1 request
  signup-load.js        C  register only (unique e-mails)                1 iteration = 1 request
  realistic-patient.js  D  patient journey (book + cancel)               1 iteration = 7-8 requests
  realistic-doctor.js   E  doctor journey (lists + medical history)      1 iteration = 5-9 requests
  pharmacy-load.js      F  prescription/walk-in sale journey             1 iteration = 3-4 requests
  appointment-load.js   G  booking only                                  1 iteration = 1 request
  slot-conflict.js         15-minute rule + concurrency race (correctness, not throughput)
  access-control.js        security regression: 401 foreign/forged tokens, 403 cross-patient /
                           cross-doctor / admin-only access, spoofed headers ignored
  benchmark.js             old entry point, now = api-load.js
  prepare-tokens.js        old entry point, now = seed.js TOKENS_ONLY=1
  run.sh                   runs a test AND measures the generator (CPU, RSS) + RSS guard
  hms-monitor.sh           run on the HMS host: docker stats, host CPU/mem, PG connections, Hikari
```

## 0. Prerequisites (generator EC2)

```bash
# k6 (official binary)
curl -sSL https://github.com/grafana/k6/releases/download/v1.3.0/k6-v1.3.0-linux-amd64.tar.gz | tar xz
sudo mv k6-v1.3.0-linux-amd64/k6 /usr/local/bin/ && k6 version
node --version   # >= 18 for the seed
```

Use the HMS instance's **private IP** as `BASE_URL` from the generator (same VPC/subnet). Do not
use its public Elastic IP, which sends the traffic out through the internet gateway.

## 1. Seed (once per database; safe to re-run)

```bash
cd k6
BASE_URL=http://HMS:9000 node seed/seed.js
#   defaults: BENCH_PATIENTS=200 BENCH_DOCTORS=50 BENCH_MEDICINES=20 BENCH_HISTORY_VISITS=30
#   password: BENCH_PASSWORD=Bench@1234  (must satisfy the UserMS password rule)
```

What it creates (all tagged so it can be told apart from real data):

| Data | How | Identification |
|---|---|---|
| 1 admin, N patients, M doctors | `POST /users/register` (BCrypt + ProfileMS profile). Existing users are just logged in | `bench.<role>.<nnnnn>@hmsbench.local` |
| Realistic profiles | `PUT /profile/{patient,doctor}/update`: DOB, phone, blood group, allergies, chronic conditions, specialization, unique licence/Aadhaar | name `Bench ...`, licence `BENCH-LIC-*` |
| Pharmacy medicines + stock | `POST /pharmacy/medicine/add` and `/inventory/add`. Stock is topped up to `BENCH_MIN_STOCK` | `HMSBENCH <name>`, batch `HMSBENCH-*` |
| Completed visits (medical history) | book a slot inside the next hour, then `POST /appointment/report/create` with symptoms, diagnosis, tests and a prescription that uses the bench medicines. Only for patients that don't have one yet | notes `[hmsbench] ...` |
| Admin | `bench.admin@hmsbench.local` if the DB has no admin yet. ADMIN self-registration is blocked once an admin exists, so on such a database pass `BENCH_ADMIN_EMAIL=... BENCH_ADMIN_PASSWORD=...` of an existing admin | |
| `data/bench-users.json` | e-mail, role, userId, profileId, JWT, expiry | git-ignored |
| `data/bench-meta.json` | medicine ids, unsold bench-prescription pool | git-ignored |

**JWTs expire after 5 h.** Every test refuses to start if tokens would expire mid-run. To refresh them:

```bash
BASE_URL=http://HMS:9000 TOKENS_ONLY=1 node seed/seed.js     # or: node prepare-tokens.js
```

## 2. Test order (never skip a step)

```bash
export BASE_URL=http://HMS:9000
./run.sh access-control.js                         # security: must show 0 failed checks
./run.sh slot-conflict.js                          # 15-min rule + race: must show 0 failed checks
PHASE=smoke ./run.sh auth-load.js                  # login works
PHASE=smoke ./run.sh api-load.js                   # authenticated GETs work
PHASE=smoke ./run.sh appointment-load.js           # booking works, slot_conflicts = 0
PHASE=smoke ./run.sh pharmacy-load.js              # sales work
PHASE=smoke ./run.sh realistic-patient.js
PHASE=smoke ./run.sh realistic-doctor.js
PHASE=baseline ./run.sh api-load.js                # low stable rate
# then the stepped capacity plan, one test type at a time:
PHASE=step1k ./run.sh api-load.js
PHASE=step5k ./run.sh api-load.js
PHASE=step10k ./run.sh api-load.js     # ... step20k, step50k, step100k
```

| PHASE | Iterations | Duration | TARGET_RPS (iter/s) |
|---|---|---|---|
| smoke | – | 30 s | 1 |
| baseline | – | 2 min | 5 |
| step1k | 1 000 | 60 s | 16.67 |
| step5k | 5 000 | 120 s | 41.67 |
| step10k | 10 000 | 120 s | 83.33 |
| step20k | 20 000 | 180 s | 111.11 |
| step50k | 50 000 | 300 s | 166.67 |
| step100k | 100 000 | 600 s | 166.67 (soak) |
| stress | ramping: `START_RPS`→`MAX_RPS` step `STEP_RPS`, `RAMP`+`HOLD` per step | | aborts when error rate > `STRESS_ABORT_ERROR_RATE` (5 %) |
| custom | `TARGET_RPS=.. DURATION=..` | | any |

**Go to the next step only when the current one shows:** `TARGET REACHED = YES`,
`DROPPED ITERATIONS = 0`, an acceptable error rate, and a generator verdict of
*headroom* (host CPU peak < 85 %, RSS well under the guard). If the generator is saturated,
**stop**: that run is **GENERATOR-LIMITED**. Don't raise the load; use a bigger generator or a
second generator. There is no 500k / 1M preset. Size those only after the generator's capacity
has been measured.

VU sizing: `preAllocatedVUs ≈ TARGET_RPS × iteration time`, `maxVUs` capped by `VU_CAP` (default
400, because the previous generator was OOM-killed near ~700 VUs at ~3.5 GB RSS). Override with
`PRE_VUS`, `MAX_VUS`, `VU_CAP`. When the cap is reached, k6 drops iterations. The summary then shows
it, and the run doesn't count as capacity.

## 3. Common commands

```bash
# smoke (any test)
BASE_URL=... PHASE=smoke ./run.sh api-load.js
# login benchmark (BCrypt path)
BASE_URL=... PHASE=step5k ./run.sh auth-load.js
# API throughput benchmark
BASE_URL=... PHASE=step10k ./run.sh api-load.js
# realistic workflows (TARGET_RPS = journeys/s; HTTP req/s is reported separately)
BASE_URL=... TARGET_RPS=10 DURATION=5m ./run.sh realistic-patient.js
BASE_URL=... TARGET_RPS=10 DURATION=5m THINK_TIME=1 ./run.sh realistic-doctor.js
LOGIN_EACH_ITERATION=true ...                      # include login in every journey
# signup (grows the user/profile DBs; clean up afterwards)
BASE_URL=... PHASE=step1k ./run.sh signup-load.js
# plain k6 (no generator metrics):
k6 run -e BASE_URL=... -e PHASE=smoke api-load.js
```

## 4. What every run reports

Summary table (stdout) + `results/<test>_<phase>_<RUN_ID>.summary.json` (+ `.raw.json`):

- TARGET RPS (iterations/s), approximate target HTTP RPS, ACHIEVED iterations/s, ACHIEVED HTTP RPS,
  HTTP requests per iteration, TARGET REACHED (dropped = 0 and ≥ 95 % of target)
- TOTAL REQUESTS (`http_reqs`), TOTAL ITERATIONS (`iterations`), DROPPED ITERATIONS
- ERROR RATE (`http_req_failed`), failed requests, business rejections, check pass rate
- latency `http_req_duration`: avg, p50, p90, p95, p99, max
- `vus` peak (1 s samples) / `vus_max`, `data_received` / `data_sent`
- per endpoint: count, success %, p50/p95/p99/max (`ep_<endpoint>` trends)
- thresholds that failed (`dropped_iterations count==0`, `http_req_failed rate<ERROR_RATE_MAX`,
  optional `P95_MS`, `booking_slot_conflicts count==0`, slot-rule checks)

`run.sh` adds `results/<RUN_ID>.generator.csv/.txt`: k6 cores used, k6 RSS, host CPU and available
memory every 2 s, their peaks, and a verdict. When k6 RSS goes over `GEN_MAX_RSS_MB` (default 75 % of RAM),
the test is stopped gracefully and marked **GENERATOR-LIMITED**.

Only setup/teardown traffic is excluded from the numbers (tag `bench=setup`). Response bodies are
discarded unless a script needs them (`discardResponseBodies`), which saves generator memory.

## 5. HMS-side observability (run on the HMS host during the test)

```bash
./k6/hms-monitor.sh          # Ctrl-C when the test ends -> hms-monitor-<ts>/peaks.txt
```

It records per-container CPU/memory, host CPU/memory, PostgreSQL connections per database, and
HikariCP active/idle/pending/max for UserMS, ProfileMS, AppointmentMS and PharmacyMS. It reads
Spring Actuator from inside each container with the existing `X-Secret-Key`, so nothing new is
exposed. Hikari pool size is unchanged (default 10). If measurements show `pending > 0` while the DB
is not saturated, you can test a larger pool per service with e.g.
`SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=20`.

## 6. Reading a degraded run (don't guess the bottleneck)

| Evidence | Conclusion |
|---|---|
| dropped > 0 or achieved < target **and** generator CPU ≥ 85 % / RSS near guard / VU cap hit | **GENERATOR-LIMITED**. Say nothing about HMS capacity |
| generator healthy, dropped = 0, latency rising, one container's CPU pegged (e.g. `hms-user-ms` in `auth-load`), DB/Hikari not saturated | that service's path is the observed limit (e.g. "UserMS authentication path") |
| Hikari `pending` > 0 for a service, PG CPU/connections high | DB / connection-pool bound for that service |
| gateway CPU pegged while downstream services idle | Gateway limited |
| errors = business rejections only (e.g. slot conflicts, out of stock) | test-data problem, not capacity. Fix the data first |
| host CPU ~100 % across many containers | the HMS instance (t3 burstable) is the limit. Check CPU credits in CloudWatch |

For login, BCrypt is CPU-bound in UserMS. A DB lookup or Hikari wait shows up as `pending` and PG
activity instead. Compare `auth-load` latency with UserMS CPU and Hikari metrics before
blaming either one.

## 7. Clean up benchmark rows

```bash
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < k6/seed/cleanup-bench-data.sql
```

This removes `[hmsbench]` appointments (with their reports and prescriptions), notifications sent to
`@hmsbench.local`, `HMSBENCH` sales and `bench.signup.*` users/profiles. It keeps real data and the
seeded users, profiles and medicines. Run it between capacity tiers so growing tables don't skew
the comparison.

## 8. Booking slots

HMS rule: a doctor or a patient can't have two active appointments less than 15 minutes apart.
`lib/slots.js` gives booking *n* the doctor `n % D`, the patient `n % P` and the time
`base + floor(n / D) × 15 min`. That can't collide as long as `P ≥ D`. The base day is far in the
future and derived from `RUN_ID`. Pin it with `SLOT_DAY_OFFSET=<days>`. Any rejection is counted in
`booking_slot_conflicts`, which must stay 0. A non-zero value means the data or the run setup is
wrong, not HMS capacity.
