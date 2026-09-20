// Benchmark summary: explicit target vs achieved numbers + percentiles, printed as a table and
// written as JSON (<RESULTS_DIR>/<test>_<phase>_<runId>.json). No numbers are invented: every
// value comes from the k6 end-of-test data; missing metrics are reported as null.
import { BASE_URL, PHASE, RESULTS_DIR, RUN_ID } from './config.js';

const num = (v, d = 2) => (v === undefined || v === null || Number.isNaN(v) ? null : Number(Number(v).toFixed(d)));
const val = (data, metric, key) => data.metrics[metric]?.values?.[key];

function fmtBytes(b) {
  if (b === null || b === undefined) return 'n/a';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let x = b;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}

export function buildSummary(data, test, load, extra = {}) {
  const main = 'bench:main';
  const reqs = val(data, `http_reqs{${main}}`, 'count') ?? 0;
  const iterations = val(data, 'iterations', 'count') ?? 0;
  const dropped = val(data, 'dropped_iterations', 'count') ?? 0;
  const durationSec = load.stress ? (data.state.testRunDurationMs / 1000) : load.durationSec;
  const d = (k) => val(data, `http_req_duration{${main}}`, k);

  const targetIterRate = load.stress || !load.rps ? null : load.rps;
  const achievedIterRate = durationSec ? iterations / durationSec : null;
  const achievedHttpRps = durationSec ? reqs / durationSec : null;
  const reqsPerIter = iterations ? reqs / iterations : null;
  const reached = targetIterRate === null ? null : (dropped === 0 && achievedIterRate >= 0.95 * targetIterRate);
  const vusPeak = val(data, 'vus', 'max') ?? null;
  const vusMax = val(data, 'vus_max', 'max') ?? val(data, 'vus_max', 'value') ?? null;

  const endpoints = {};
  for (const [name, m] of Object.entries(data.metrics)) {
    if (!name.startsWith('ep_') || name.endsWith('_ok') || !m.values || !m.values.count) continue;
    const ep = name.slice(3);
    endpoints[ep] = {
      count: m.values.count,
      success_rate: num(data.metrics[`${name}_ok`]?.values?.rate, 4),
      p50_ms: num(m.values.med), p90_ms: num(m.values['p(90)']), p95_ms: num(m.values['p(95)']),
      p99_ms: num(m.values['p(99)']), max_ms: num(m.values.max),
    };
  }

  const notes = [];
  if (targetIterRate !== null && targetIterRate > 0 && !reached) {
    notes.push('TARGET NOT REACHED: dropped iterations > 0 or achieved < 95% of target. ' +
      'Do not report this as HMS capacity. Check generator CPU/RSS (run.sh output) and VU usage: ' +
      'if the generator is saturated or vus_max hit its cap this is GENERATOR-LIMITED; ' +
      'if the generator is healthy and HMS latency/errors rose, correlate with HMS container stats.');
  }
  if (!extra.fixedVus && vusMax !== null && vusPeak !== null && vusPeak >= vusMax && vusMax > 0) {
    notes.push(`All ${vusMax} allocated VUs were busy at peak (VU pool exhausted).`);
  }

  return {
    test, phase: PHASE, run_id: RUN_ID, base_url: BASE_URL,
    finished_at: new Date().toISOString(),
    iteration_model: extra.iterationModel || '1 iteration = 1 HTTP request',
    target: load.stress
      ? { mode: 'stress (ramping-arrival-rate)', start_iter_per_s: load.startRps, max_iter_per_s: load.maxRps, step: load.stepRps, ramp: load.ramp, hold: load.hold }
      : { iterations_per_s: num(targetIterRate), duration_s: load.durationSec, total_iterations: load.total,
        http_rps_expected: reqsPerIter !== null && targetIterRate !== null ? num(targetIterRate * reqsPerIter) : null },
    achieved: {
      iterations_per_s: num(achievedIterRate), http_rps: num(achievedHttpRps), http_reqs_per_iteration: num(reqsPerIter),
      target_reached: reached,
    },
    totals: { http_requests: reqs, iterations, dropped_iterations: dropped },
    errors: {
      http_req_failed_rate: num(val(data, `http_req_failed{${main}}`, 'rate'), 4),
      failed_requests: val(data, `http_req_failed{${main}}`, 'passes') ?? null,
      business_rejections: val(data, 'business_rejections', 'count') ?? 0,
      checks_pass_rate: num(val(data, 'checks', 'rate'), 4),
    },
    latency_ms: { avg: num(d('avg')), p50: num(d('med')), p90: num(d('p(90)')), p95: num(d('p(95)')), p99: num(d('p(99)')), max: num(d('max')) },
    vus: { peak_active: vusPeak, vus_max_allocated: vusMax },
    data: { received_bytes: val(data, 'data_received', 'count') ?? null, sent_bytes: val(data, 'data_sent', 'count') ?? null },
    endpoints,
    custom: extra.custom ? extra.custom(data) : undefined,
    thresholds_failed: Object.entries(data.metrics).filter(([, m]) => m.thresholds && Object.values(m.thresholds).some((t) => !t.ok)).map(([k]) => k),
    notes,
  };
}

function table(s) {
  const L = [];
  const row = (k, v) => L.push(`  ${k.padEnd(26)} ${v === null || v === undefined ? 'n/a' : v}`);
  L.push('');
  L.push(`==================== HMS BENCHMARK: ${s.test} / ${s.phase} ====================`);
  row('RUN ID', s.run_id);
  row('BASE URL', s.base_url);
  row('ITERATION MODEL', s.iteration_model);
  if (s.target.mode) {
    row('TARGET', `${s.target.mode}: ${s.target.start_iter_per_s} -> ${s.target.max_iter_per_s} it/s (+${s.target.step})`);
  } else {
    row('TARGET RPS (iter/s)', s.target.iterations_per_s);
    row('TARGET HTTP RPS (approx)', s.target.http_rps_expected);
  }
  row('ACHIEVED ITER/S', s.achieved.iterations_per_s);
  row('ACHIEVED HTTP RPS', s.achieved.http_rps);
  row('HTTP REQS / ITERATION', s.achieved.http_reqs_per_iteration);
  row('TARGET REACHED', s.achieved.target_reached === null ? 'n/a (no fixed target)' : s.achieved.target_reached ? 'YES' : 'NO');
  row('TOTAL REQUESTS', s.totals.http_requests);
  row('TOTAL ITERATIONS', s.totals.iterations);
  row('DROPPED ITERATIONS', s.totals.dropped_iterations);
  row('ERROR RATE', s.errors.http_req_failed_rate === null ? null : `${(s.errors.http_req_failed_rate * 100).toFixed(3)} %`);
  row('BUSINESS REJECTIONS', s.errors.business_rejections);
  row('P50 / P90 (ms)', `${s.latency_ms.p50} / ${s.latency_ms.p90}`);
  row('P95 / P99 (ms)', `${s.latency_ms.p95} / ${s.latency_ms.p99}`);
  row('MAX (ms)', s.latency_ms.max);
  row('PEAK VUs (active* / alloc)', `${s.vus.peak_active} / ${s.vus.vus_max_allocated}`);
  row('DATA RECEIVED / SENT', `${fmtBytes(s.data.received_bytes)} / ${fmtBytes(s.data.sent_bytes)}`);
  const eps = Object.entries(s.endpoints);
  if (eps.length) {
    L.push('  ---- per endpoint ----------------------------------------------------------');
    L.push(`  ${'endpoint'.padEnd(30)}${'count'.padStart(8)}${'ok%'.padStart(8)}${'p50'.padStart(9)}${'p95'.padStart(9)}${'p99'.padStart(9)}${'max'.padStart(9)}`);
    for (const [name, e] of eps) {
      L.push(`  ${name.padEnd(30)}${String(e.count).padStart(8)}${(e.success_rate === null ? 'n/a' : (e.success_rate * 100).toFixed(1)).padStart(8)}${String(e.p50_ms).padStart(9)}${String(e.p95_ms).padStart(9)}${String(e.p99_ms).padStart(9)}${String(e.max_ms).padStart(9)}`);
    }
  }
  if (s.custom) {
    L.push('  ---- test-specific ---------------------------------------------------------');
    for (const [k, v] of Object.entries(s.custom)) row(k, typeof v === 'object' ? JSON.stringify(v) : v);
  }
  if (s.thresholds_failed.length) row('THRESHOLDS FAILED', s.thresholds_failed.join(', '));
  for (const n of s.notes) L.push(`  NOTE: ${n}`);
  L.push('  * active VUs are sampled once per second by k6; short iterations can show a low peak.');
  L.push('  (Generator CPU/memory: see run.sh output / *.generator.csv — k6 cannot measure itself.)');
  L.push('==========================================================================================');
  L.push('');
  return L.join('\n');
}

export function makeHandleSummary(test, load, extra) {
  return function handleSummary(data) {
    const s = buildSummary(data, test, load, extra);
    const base = `${RESULTS_DIR}/${test}_${s.phase}_${s.run_id}`;
    return {
      stdout: table(s),
      [`${base}.summary.json`]: JSON.stringify(s, null, 2),
      [`${base}.raw.json`]: JSON.stringify(data),
    };
  };
}
