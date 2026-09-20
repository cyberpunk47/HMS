#!/usr/bin/env bash
# Run one k6 test while measuring the LOAD GENERATOR itself (k6 cannot measure its own CPU/RAM).
#
#   ./run.sh <script.js> [extra k6 args]
#   BASE_URL=http://10.0.1.x:9000 PHASE=step5k ./run.sh api-load.js
#   BASE_URL=... TARGET_RPS=40 DURATION=3m ./run.sh realistic-patient.js
#
# Every -e style setting can be given as an environment variable (BASE_URL, PHASE, TARGET_RPS,
# DURATION, PRE_VUS, MAX_VUS, VU_CAP, ...): they are forwarded to k6.
#
# Writes (results/):
#   <test>_<phase>_<RUN_ID>.summary.json / .raw.json   (from k6 handleSummary)
#   <RUN_ID>.generator.csv                             (k6 process CPU/RSS + host CPU/mem every SAMPLE_S)
#   <RUN_ID>.generator.txt                             (peaks + verdict)
#
# Safety: if k6 RSS exceeds GEN_MAX_RSS_MB (default 75% of RAM) the test is stopped gracefully
# (SIGINT -> k6 still writes its summary) and the run is marked GENERATOR-LIMITED.
set -uo pipefail

if [ $# -lt 1 ]; then sed -n '2,20p' "$0"; exit 1; fi
SCRIPT=$1; shift
cd "$(dirname "$0")"
command -v k6 >/dev/null || { echo "k6 not found in PATH"; exit 1; }

RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
SAMPLE_S=${SAMPLE_S:-2}
TOTAL_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
GEN_MAX_RSS_MB=${GEN_MAX_RSS_MB:-$((TOTAL_MB * 75 / 100))}
CORES=$(nproc)
TCK=$(getconf CLK_TCK)
mkdir -p results
CSV="results/${RUN_ID}.generator.csv"
TXT="results/${RUN_ID}.generator.txt"

ENV_ARGS=()
for v in BASE_URL PHASE TARGET_RPS DURATION PRE_VUS MAX_VUS VU_CAP ERROR_RATE_MAX P95_MS START_RPS MAX_RPS STEP_RPS RAMP HOLD \
         STRESS_ABORT_ERROR_RATE SLOT_DAY_OFFSET BENCH_PASSWORD BENCH_TZ_OFFSET_MINUTES THINK_TIME LOGIN_EACH_ITERATION \
         INCLUDE_ALL_PRESCRIPTIONS RACE_VUS RACE_GROUPS RACE_INTERVAL_S DEBUG; do
  [ -n "${!v:-}" ] && ENV_ARGS+=(-e "$v=${!v}")
done

echo "run_id=$RUN_ID script=$SCRIPT cores=$CORES ram=${TOTAL_MB}MB rss_guard=${GEN_MAX_RSS_MB}MB"
k6 run -e RUN_ID="$RUN_ID" -e RESULTS_DIR=results "${ENV_ARGS[@]}" "$@" "$SCRIPT" &
PID=$!

echo "ts,k6_cpu_pct_of_host,k6_cores_used,k6_rss_mb,host_cpu_pct,host_mem_avail_mb" > "$CSV"
read_cpu() { awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5+$6}' /proc/stat; }
read_proc() { awk '{print $14+$15}' "/proc/$PID/stat" 2>/dev/null; }
LIMITED=""
read -r H_TOT0 H_IDLE0 < <(read_cpu); P0=$(read_proc); P0=${P0:-0}
while kill -0 "$PID" 2>/dev/null; do
  sleep "$SAMPLE_S"
  kill -0 "$PID" 2>/dev/null || break
  read -r H_TOT1 H_IDLE1 < <(read_cpu); P1=$(read_proc); P1=${P1:-$P0}
  RSS=$(awk '/VmRSS/ {print int($2/1024)}' "/proc/$PID/status" 2>/dev/null); RSS=${RSS:-0}
  AVAIL=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
  awk -v ts="$(date +%s)" -v p0="$P0" -v p1="$P1" -v t="$TCK" -v s="$SAMPLE_S" -v c="$CORES" \
      -v ht0="$H_TOT0" -v ht1="$H_TOT1" -v hi0="$H_IDLE0" -v hi1="$H_IDLE1" -v rss="$RSS" -v av="$AVAIL" \
      'BEGIN { cores=(p1-p0)/t/s; dt=ht1-ht0; hc=(dt>0)?100*(1-(hi1-hi0)/dt):0;
               printf "%s,%.1f,%.2f,%d,%.1f,%d\n", ts, 100*cores/c, cores, rss, hc, av }' >> "$CSV"
  P0=$P1; H_TOT0=$H_TOT1; H_IDLE0=$H_IDLE1
  if [ "$RSS" -gt "$GEN_MAX_RSS_MB" ] && [ -z "$LIMITED" ]; then
    LIMITED="k6 RSS ${RSS}MB > guard ${GEN_MAX_RSS_MB}MB"
    echo "!!! GENERATOR-LIMITED: $LIMITED — stopping k6 gracefully (summary will still be written)"
    kill -INT "$PID"
  fi
done
wait "$PID"; RC=$?

awk -F, -v limited="$LIMITED" -v rc="$RC" 'NR>1 { n++; if ($3>pc) pc=$3; sc+=$3; if ($4>pr) pr=$4; if ($5>ph) ph=$5; sh+=$5 }
  END {
    if (n==0) { print "no generator samples (test shorter than SAMPLE_S?)"; exit }
    printf "GENERATOR  samples=%d  k6 cores used: peak %.2f avg %.2f  |  k6 RSS peak %d MB  |  host CPU peak %.0f%% avg %.0f%%\n", n, pc, sc/n, pr, ph, sh/n;
    if (limited != "") print "VERDICT: GENERATOR-LIMITED (" limited "). Do not treat this run as an HMS limit.";
    else if (ph >= 85) print "VERDICT: GENERATOR CPU SATURATED (host CPU peak >= 85%). Results are GENERATOR-LIMITED; do not raise load further on this machine.";
    else print "VERDICT: generator had headroom (host CPU peak < 85%, RSS under guard). Check the k6 summary for dropped iterations / target reached.";
    print "k6 exit code: " rc " (99 = thresholds crossed, e.g. dropped iterations or error rate)";
  }' "$CSV" | tee "$TXT"
exit $RC
