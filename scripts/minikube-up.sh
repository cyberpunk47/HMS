#!/usr/bin/env bash
###############################################################################
# The whole platform, on your laptop, in one command.
#
#   ./scripts/minikube-up.sh
#
# Creates a minikube cluster and installs the same things the AWS pipeline does:
# ingress-nginx, Prometheus, Grafana, KEDA, the nine HMS containers, the Grafana
# dashboard, and seeded data. The SAME manifests in k8s/ are used - only the Helm
# values files and the KEDA threshold differ, because a laptop is not a cluster
# of EC2 machines.
#
# Honest difference from the AWS setup, worth saying out loud in the report:
# on AWS the load generator runs on its own tainted node so it never competes
# with the application for CPU. On one laptop there is no second machine, so k6
# runs on the host and shares your CPU. That is why the demo rate here is 600
# req/s instead of 1000+.
#
# Re-running is safe: it skips what already exists and only rebuilds images.
###############################################################################
set -euo pipefail

PROFILE=${PROFILE:-hms}
CPUS=${CPUS:-4}
MEMORY=${MEMORY:-10240}            # MB
export IMAGE_TAG=${IMAGE_TAG:-dev}
export ECR_REGISTRY=${ECR_REGISTRY:-hms-local}   # the manifests prefix images with this
export KEDA_RPS_PER_POD=${KEDA_RPS_PER_POD:-100} # 600 req/s -> 6 gateway pods

cd "$(dirname "$0")/.."

step() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1"; exit 1; }; }

step "0/8  checking tools"
for t in minikube kubectl helm docker node envsubst; do need "$t"; done
echo "all present"

step "1/8  starting minikube ($CPUS CPUs, ${MEMORY}MB)"
if minikube status -p "$PROFILE" >/dev/null 2>&1; then
  echo "profile '$PROFILE' already running"
else
  minikube start -p "$PROFILE" --cpus="$CPUS" --memory="$MEMORY" --driver=docker --addons=metrics-server
fi
kubectl config use-context "$PROFILE" >/dev/null
NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
# Every Deployment asks for nodeSelector role=app; on one node we simply label it.
kubectl label node "$NODE" role=app --overwrite >/dev/null
echo "node: $NODE"

step "2/8  installing platform charts (first run downloads a lot)"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add kedacore https://kedacore.github.io/charts >/dev/null 2>&1 || true
helm repo update >/dev/null

# Prometheus first: it installs the CRDs that the ingress controller's
# ServiceMonitor needs in order to register itself.
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f monitoring/values-kube-prometheus.minikube.yaml \
  --wait --timeout 12m

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  -f monitoring/values-ingress-nginx.minikube.yaml \
  --wait --timeout 8m

helm upgrade --install keda kedacore/keda \
  --namespace keda --create-namespace --wait --timeout 8m

step "3/8  building 8 images inside minikube"
echo "The first build compiles every service with Maven - expect 10-15 minutes."
echo "Later runs reuse the layer cache and take about a minute."
eval "$(minikube -p "$PROFILE" docker-env)"
build() { # build <image-name> <context>
  printf "   building %-16s" "$1"
  docker build -q -t "${ECR_REGISTRY}/hms/$1:${IMAGE_TAG}" "$2" >/dev/null
  echo "done"
}
build eureka-server   backend/Eureka-Server
build gateway         backend/GatewayMS
build user-ms         backend/UserMS
build profile-ms      backend/ProfileMS
build appointment-ms  backend/Appointment
build pharmacy-ms     backend/PharmacyMS
build notification-ms backend/NotificationMS
build frontend        frontend/hms
eval "$(minikube -p "$PROFILE" docker-env -u)"

step "4/8  namespace, secrets, database list"
kubectl apply -f k8s/00-namespace.yaml
kubectl -n hms get secret hms-secrets >/dev/null 2>&1 || \
  kubectl -n hms create secret generic hms-secrets \
    --from-literal=JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')" \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)"
kubectl -n hms create configmap postgres-init \
  --from-file=init-databases.sql=docker/postgres/init-databases.sql \
  --dry-run=client -o yaml | kubectl apply -f -

step "5/8  deploying HMS"
for f in k8s/10-data.yaml k8s/20-services.yaml k8s/30-frontend-ingress.yaml; do
  envsubst '${ECR_REGISTRY} ${IMAGE_TAG}' < "$f" | kubectl apply -f -
done
kubectl apply -f k8s/41-monitoring.yaml
envsubst '${KEDA_RPS_PER_POD}' < k8s/40-autoscaling.yaml | kubectl apply -f -

# The dashboard is provisioned, not clicked together: Grafana's sidecar loads any
# ConfigMap labelled grafana_dashboard=1.
kubectl -n monitoring create configmap hms-dashboard \
  --from-file=hms-dashboard.json=monitoring/dashboard-hms.json \
  --dry-run=client -o yaml | kubectl label --local -f - grafana_dashboard=1 -o yaml | kubectl apply -f -

echo "waiting for the data layer..."
kubectl -n hms rollout status deploy/postgres      --timeout=5m
kubectl -n hms rollout status deploy/kafka         --timeout=5m
kubectl -n hms rollout status deploy/eureka-server --timeout=5m
echo "waiting for the services (Spring Boot takes ~40s each to pass readiness)..."
for d in gateway user-ms profile-ms appointment-ms pharmacy-ms notification-ms frontend; do
  kubectl -n hms rollout status deploy/$d --timeout=8m
done

step "6/8  finding the public address"
MIP=$(minikube -p "$PROFILE" ip)
BASE="http://${MIP}:30080"
for i in $(seq 1 30); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE/healthz" || true)" = "200" ] && break
  sleep 5
done
echo "$BASE" > .minikube_url
echo "reachable at $BASE"

step "7/8  seeding data through the public API"
PATIENTS=${PATIENTS:-100} DOCTORS=${DOCTORS:-25} MEDICINES=${MEDICINES:-20} HISTORY_VISITS=${HISTORY_VISITS:-2} \
  BASE_URL="$BASE/api" node k6/seed/seed.js

step "8/8  verifying endpoints"
fail=0
check() { # check <label> <url> <expected> [header]
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${4:+-H "$4"} "$2")
  if [ "$code" = "$3" ]; then printf "   PASS  %-30s %s\n" "$1" "$code"
  else printf "   FAIL  %-30s got %s want %s\n" "$1" "$code" "$3"; fail=1; fi
}
TOKEN=$(curl -s -X POST "$BASE/api/users/login" -H 'Content-Type: application/json' \
        -d '{"email":"bench.admin@hmsbench.local","password":"Bench@1234"}' | tr -d '"')
AUTH="Authorization: Bearer $TOKEN"
check "frontend page"           "$BASE/"                              200
check "gateway rejects no-auth" "$BASE/api/profile/patient/getAll"    401
check "admin lists patients"    "$BASE/api/profile/patient/getAll"    200 "$AUTH"
check "admin appointments"      "$BASE/api/appointment/all?page=0&size=5" 200 "$AUTH"
check "pharmacy medicines"      "$BASE/api/pharmacy/medicine/getAll"  200 "$AUTH"

cat <<EOF

$( [ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED - see above" )

  Application : $BASE
  Grafana     : http://${MIP}:30030   (admin / admin)
  Login as    : bench.admin@hmsbench.local / Bench@1234

  Fire traffic and watch it scale:
      ./scripts/minikube-load.sh 600

  Watch pods in another terminal:
      watch -n 5 'kubectl -n hms get deploy gateway; kubectl -n hms get scaledobject'

  Shut it down (keeps the images for next time):
      minikube stop -p $PROFILE
  Delete it entirely:
      minikube delete -p $PROFILE
EOF
exit $fail
