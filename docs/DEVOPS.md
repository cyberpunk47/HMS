# HMS on AWS — setup, access, and the demo

Everything here is automated. You run **one** command on your laptop; after that
you work from the Jenkins web page. No SSH, no installing Docker by hand, no
copying files to servers.

---

## 1. What you run, once

On your laptop (needs Terraform + AWS CLI configured):

```bash
curl ifconfig.me          # note your public IP

cd infra/bootstrap
terraform init
terraform apply -var="117.99.234.29/32"
```

That creates one small EC2 machine. While it boots (~4 minutes) cloud-init
installs Jenkins, Docker, kubectl, helm, Terraform, AWS CLI and Node on it, and
writes a Jenkins configuration file that already contains both pipeline jobs.

Then:

```bash
terraform output jenkins_url            # http://X.X.X.X:8080
terraform output -raw jenkins_password  # the admin password
```

**That is the last manual step.** Everything below happens in the browser.

---

## 2. How you reach each tool

| Tool | Address | Login | Who can open it |
|---|---|---|---|
| **Jenkins** | `http://<jenkins-ip>:8080` (from `terraform output jenkins_url`) | `admin` / `terraform output -raw jenkins_password` | only your IP — set in the security group |
| **HMS application** | `http://<nlb-hostname>/` — printed at the end of the `hms-platform` build, or `make urls` | the seeded accounts, e.g. `bench.admin@hmsbench.local` / `Bench@1234` | the internet (it is the public site) |
| **HMS API** | `http://<nlb-hostname>/api/...` — same host, `/api` prefix | JWT from `/api/users/login` | the internet, but every route needs a token |
| **Grafana** | `http://<grafana-nlb-hostname>/` — printed at the end of the build, or `make urls` | `admin` / printed in the build log, also `make urls` | only the IP you pass as `OPERATOR_CIDR` |
| **Prometheus** | not public on purpose | — | `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090` then `localhost:9090` |
| **Kubernetes** | `make kubeconfig`, then `kubectl` | your AWS identity | whoever holds AWS credentials |

**Addresses change** every time the cluster is recreated, because AWS issues a new
load balancer. `make urls` always prints the current ones — do not write them down.

---

## 3. What is public and what is not

```
                    Internet
                       │
        ┌──────────────┴───────────────┐
        │                              │
   NLB (app)                      NLB (grafana)
   open to all                    open to YOUR IP only
        │                              │
        ▼                              ▼
  ingress-nginx  ──/──▶ frontend pods   Grafana
        │        ──/api──▶ gateway pod
        ▼
   user · profile · appointment · pharmacy · notification     ← ClusterIP, private
        ▼
   postgres · kafka · eureka                                   ← ClusterIP, private
```

1. **Public:** exactly two hostnames — the application load balancer, and Grafana's (restricted to your IP).
2. **Private:** every service, the database, Kafka and Eureka have `ClusterIP` addresses, which only work inside the cluster. Nothing outside the cluster can dial them.
3. **The worker machines** have public IPs (so they can pull images without a NAT Gateway, which would cost ~$0.045/hour), but their security group accepts inbound traffic only from the load balancer. Production would use private subnets plus NAT; that trade-off is deliberate and stated.
4. **Jenkins** is reachable only from your IP, on port 8080.

If asked "how does each part talk to the other": by **Kubernetes Service names**.
`postgres`, `kafka` and `eureka-server` are the Service names, which is why the
application configuration written for Docker Compose works here unchanged.

---

## 4. Running it: two jobs

### Job 1 — `hms-platform`

Click **Build with Parameters** → set `OPERATOR_CIDR` to `YOUR.IP/32` → Build.

| Stage | What happens | Time |
|---|---|---|
| Infrastructure | Terraform builds the VPC, the EKS cluster, two node groups and 8 ECR repositories | 15–18 min (first run) |
| Connect | fetches cluster credentials | 10 s |
| Platform tools | Helm installs ingress-nginx, Prometheus, Grafana, KEDA, k6-operator | 6–8 min |
| Build images | Docker builds 7 service images + the frontend, pushes to ECR | 8–10 min |
| Deploy | applies the manifests, waits for every rollout | 4–6 min |
| Public address | waits for the load balancer to answer | 1–3 min |
| Seed data | creates 200 patients, 50 doctors, visits and prescriptions **through the public API** | 1–2 min |
| Verify | checks 8 endpoints, including that an unauthenticated call is refused | 20 s |

First run: about 40 minutes. Re-runs with `CREATE_INFRA` and `INSTALL_PLATFORM`
unticked: about 12 minutes.

### Job 2 — `hms-loadtest`

Click **Build with Parameters** → `RATE = 5000` → Build. This is the live demo.

It refreshes the JWTs (they expire after 5 hours — a stale token would make the
whole test fail with 401s and look like a capacity problem), ships the k6 scripts
into the cluster as a ConfigMap, starts 4 k6 pods **on the loadgen node**, and
prints the gateway pod count every 15 seconds while the test runs.

---

## 5. Why the pod count is what it is

Not a guess — it comes from the earlier benchmark on EC2:

1. The gateway used **0.407 of a CPU core while serving 628 req/s**.
2. That is **~1540 req/s per core**.
3. At a safe 70% utilisation: **~1200 req/s per pod** — this is KEDA's threshold.
4. So **5000 ÷ 1200 ≈ 5 gateway pods**, and the cluster reaches that in about a minute.

KEDA scales on requests per second read from the ingress controller's own counter,
not on CPU. Two reasons: the number is defensible (see above), and it is
repeatable on stage — a CPU rule would trip at whatever moment CPU happened to
cross the line.

The backend services scale on CPU, because they are not the entry point.

---

## 6. The demo, minute by minute

Start the cluster **before** class (`hms-platform` finished, pods green).

| Time | Screen | What you say |
|---|---|---|
| 0:00–0:40 | Jenkins build history | "One pipeline creates the cluster, installs everything and deploys. Nothing was installed by hand." |
| 0:40–1:00 | `hms-loadtest` → RATE=5000 → **Build** | "Load testing is a separate job on purpose: it is a performance gate, not a build gate." |
| 1:00–1:30 | The application in a browser | "This is the public URL, and it is the same URL the load test fires at — the traffic takes the user's path." |
| 1:30–3:30 | **Grafana** | requests/sec climbing, gateway pods 1 → 5, p95 staying flat, CPU per pod. |
| 3:30–4:10 | `kubectl get scaledobject` in the Jenkins log | "KEDA's own view: 5000 req/s against a 1200 per-pod threshold, so five pods." |
| 4:10–4:40 | Architecture slide | public vs private, two node groups, why the generator is fenced off. |
| 4:40–5:00 | `make cost` | "About ₹110 an hour while it runs, and one command destroys all of it." |

Start the load test **before** you switch to Grafana. KEDA polls every 15 seconds,
so there is a short delay before pods appear — you want that delay to pass while
you are still talking.

---

## 7. Questions you should expect

1. **"Where is the traffic fired from?"** From k6 pods inside the cluster, but on a **separate node group that carries a taint** so no application pod can run there. The generator and the system under test never share a CPU. The earlier EC2 benchmark showed why that matters: when the generator saturated, the run had to be discarded as generator-limited.
2. **"Why not put the load test in the CI/CD pipeline?"** Build pipelines must be fast and repeatable. A 5-minute load test on every commit makes builds slow and introduces failures that are about capacity, not code.
3. **"Who created Jenkins?"** Terraform, with cloud-init. Jenkins deliberately lives outside the cluster — it is the thing that creates and destroys the cluster, so it cannot live inside it.
4. **"How do the services find each other?"** Eureka for service-to-service calls, Kubernetes DNS for infrastructure. One Kubernetes-specific setting was needed: `EUREKA_INSTANCE_PREFER_IP_ADDRESS=true`, because a pod's hostname is not resolvable, while its IP is.
5. **"Why is the database inside the cluster?"** Because this environment lives for hours and is re-seeded on every deploy. For anything real it would be Amazon RDS and Amazon MSK; the storage here is deliberately temporary.
6. **"How do you know it is not over-provisioned?"** The node count comes from measured CPU per request (~1.9 ms), not from a round number.

---

## 8. Stopping the bill

```bash
make destroy-cluster   # removes EKS, nodes and load balancers; keeps Jenkins
make destroy-all       # removes Jenkins too
```

Approximate cost while running: **$1.25/hour (~₹110)**. The EKS control plane alone
is $0.10/hour and bills from the moment the cluster exists, whether or not
anything is deployed on it — so destroy it the same day.

---

## 9. Honest limitations (put these in the report)

1. Single PostgreSQL pod and single Kafka broker, both on temporary storage — no high availability, no durability.
2. Worker nodes sit in public subnets to avoid NAT Gateway charges; production would use private subnets.
3. The Jenkins instance role is broad (`*FullAccess` policies). It is scoped to the services used and is explainable, but it is not least privilege.
4. There is no TLS. The public address is plain HTTP, because a certificate needs a domain name this project does not own.
5. The pipeline has no approval gate between build and deploy; a real one would gate the production stage.
