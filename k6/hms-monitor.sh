#!/usr/bin/env bash
# Run ON THE HMS HOST during a benchmark (Ctrl-C to stop). Samples every INTERVAL seconds:
#   - per-container CPU / memory (docker stats)
#   - host CPU / available memory
#   - PostgreSQL connections per database (total / active)
#   - HikariCP active / idle / pending per service (Spring Actuator, internal only:
#     called from inside each container with the existing X-Secret-Key header)
# Output: hms-monitor-<ts>/{containers,host,postgres,hikari}.csv + peaks.txt on exit.
set -uo pipefail
INTERVAL=${INTERVAL:-5}
SECRET=${INTERNAL_SECRET:-SECRET}
OUT=${OUT:-hms-monitor-$(date +%Y%m%d-%H%M%S)}
PG=${PG_CONTAINER:-hms-postgres}
# container:port of the services that use HikariCP
SERVICES=${SERVICES:-"hms-user-ms:8082 hms-profile-ms:9100 hms-appointment-ms:9200 hms-pharmacy-ms:9300"}
mkdir -p "$OUT"
echo "ts,container,cpu_pct,mem_usage,mem_pct,net_io,block_io,pids" > "$OUT/containers.csv"
echo "ts,host_cpu_pct,mem_avail_mb,load1" > "$OUT/host.csv"
echo "ts,database,connections,active" > "$OUT/postgres.csv"
echo "ts,service,hikari_active,hikari_idle,hikari_pending,hikari_max" > "$OUT/hikari.csv"

metric() { # container port metric
  docker exec "$1" wget -qO- --header "X-Secret-Key: $SECRET" "http://localhost:$2/actuator/metrics/$3" 2>/dev/null \
    | grep -o '"value":[0-9.eE+-]*' | head -1 | cut -d: -f2
}
read_cpu() { awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5+$6}' /proc/stat; }

summarize() {
  {
    echo "== peaks ($OUT) =="
    awk -F, 'NR>1 { gsub("%","",$3); if ($3+0>p[$2]) p[$2]=$3+0 } END { for (c in p) printf "container %-22s peak CPU %6.1f%%\n", c, p[c] }' "$OUT/containers.csv" | sort
    awk -F, 'NR>1 { if ($2>h) h=$2; if (m==""||$3<m) m=$3 } END { printf "host CPU peak %.1f%%, min available memory %s MB\n", h, m }' "$OUT/host.csv"
    awk -F, 'NR>1 { if ($3>c[$2]) c[$2]=$3; if ($4>a[$2]) a[$2]=$4 } END { for (d in c) printf "postgres %-22s peak connections %s (active %s)\n", d, c[d], a[d] }' "$OUT/postgres.csv" | sort
    awk -F, 'NR>1 { if ($3>a[$2]) a[$2]=$3; if ($5>p[$2]) p[$2]=$5; m[$2]=$6 } END { for (s in a) printf "hikari %-20s peak active %s / max %s, peak pending %s\n", s, a[s], m[s], p[s] }' "$OUT/hikari.csv" | sort
  } | tee "$OUT/peaks.txt"
}
trap 'echo; summarize; exit 0' INT TERM

echo "sampling every ${INTERVAL}s into $OUT (Ctrl-C to stop)"
read -r T0 I0 < <(read_cpu)
while true; do
  sleep "$INTERVAL"
  TS=$(date +%s)
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}' \
    | sed "s/^/$TS,/" >> "$OUT/containers.csv"
  read -r T1 I1 < <(read_cpu)
  awk -v ts="$TS" -v t0="$T0" -v t1="$T1" -v i0="$I0" -v i1="$I1" \
      -v av="$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)" -v l="$(cut -d' ' -f1 /proc/loadavg)" \
      'BEGIN { d=t1-t0; printf "%s,%.1f,%s,%s\n", ts, (d>0)?100*(1-(i1-i0)/d):0, av, l }' >> "$OUT/host.csv"
  T0=$T1; I0=$I1
  docker exec "$PG" psql -U postgres -Atc \
    "select datname, count(*), count(*) filter (where state='active') from pg_stat_activity where datname like 'hms_%' group by datname" 2>/dev/null \
    | tr '|' ',' | sed "s/^/$TS,/" >> "$OUT/postgres.csv"
  for sp in $SERVICES; do
    c=${sp%%:*}; p=${sp##*:}
    echo "$TS,$c,$(metric "$c" "$p" hikaricp.connections.active),$(metric "$c" "$p" hikaricp.connections.idle),$(metric "$c" "$p" hikaricp.connections.pending),$(metric "$c" "$p" hikaricp.connections.max)" >> "$OUT/hikari.csv"
  done
done
