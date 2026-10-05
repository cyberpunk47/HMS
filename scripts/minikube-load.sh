#!/usr/bin/env bash
###############################################################################
# Fire traffic at the local cluster and watch KEDA add pods.
#
#   ./scripts/minikube-load.sh            # 600 req/s for 3 minutes -> 6 pods
#   ./scripts/minikube-load.sh 200 2m     # 200 req/s for 2 minutes -> 1 pod
#   ./scripts/minikube-load.sh 1000 3m    # 1000 req/s -> 6 pods (hits maxReplicas)
#
# Pod count is arithmetic, not luck: KEDA is set to 100 req/s per pod on minikube,
# so replicas = RATE / 100, capped at 6.
#
# k6 runs on the host here (on AWS it runs in the cluster on its own node). It
# streams its metrics into Prometheus through a port-forward, so the Grafana
# dashboard shows k6's latency and the cluster's pod count on one time axis.
###############################################################################
set -euo pipefail

RATE=${1:-600}
DURATION=${2:-3m}
PROFILE=${PROFILE:-hms}

cd "$(dirname "$0")/.."

command -v k6 >/dev/null || { echo "k6 is not installed. See k6.io/docs/get-started/installation"; exit 1; }
[ -f k6/data/bench-users.json ] || { echo "No seeded users. Run ./scripts/minikube-up.sh first."; exit 1; }

MIP=$(minikube -p "$PROFILE" ip)
BASE="http://${MIP}:30080"
API="${BASE}/api"

echo "Target     : $API"
echo "Rate       : $RATE req/s for $DURATION"
echo "Expect     : $(( (RATE + 99) / 100 )) gateway pods (capped at 6)"
echo "Grafana    : http://${MIP}:30030  (admin / admin) - open the 'HMS - Load and Autoscaling' dashboard"
echo

# Tokens expire after 5 hours; a stale token turns the whole run into 401s, which
# looks like a capacity problem and is not one.
echo "refreshing tokens..."
BASE_URL="$API" TOKENS_ONLY=1 node k6/seed/seed.js >/dev/null 2>&1 || \
  BASE_URL="$API" node k6/seed/seed.js >/dev/null

# Prometheus is a ClusterIP service, so reach it through a port-forward for the
# duration of the run.
echo "opening a port-forward to Prometheus..."
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090 >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null || true' EXIT
sleep 3

echo "before:"
kubectl -n hms get deploy gateway -o wide

# Print the pod count every 15s alongside the test, so the scaling is visible even
# if Grafana is not on screen.
( while kill -0 $$ 2>/dev/null; do
    printf "   [%s] gateway pods: %s\n" "$(date +%H:%M:%S)" \
      "$(kubectl -n hms get deploy gateway -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)"
    sleep 15
  done ) &
WATCH=$!
trap 'kill $PF $WATCH 2>/dev/null || true' EXIT

mkdir -p k6/results
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
K6_PROMETHEUS_RW_TREND_STATS="p(95),p(99),max,avg" \
k6 run -o experimental-prometheus-rw \
  -e BASE_URL="$API" -e TARGET_RPS="$RATE" -e DURATION="$DURATION" -e VU_CAP=300 \
  --tag testid="minikube-$(date +%H%M%S)" \
  k6/api-load.js

kill $WATCH 2>/dev/null || true
echo
echo "after:"
kubectl -n hms get deploy gateway -o wide
kubectl -n hms get scaledobject,hpa
echo
echo "Pods scale back to 1 about two minutes after the load stops (KEDA cooldownPeriod)."
