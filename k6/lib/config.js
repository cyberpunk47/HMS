// Shared benchmark configuration: phases, arrival-rate scenario builder, VU sizing.
//
// Terminology used everywhere in this suite:
//   TARGET_RPS  = target ITERATIONS per second (arrival rate k6 tries to start).
//   For single-request tests (api/auth/signup/appointment) 1 iteration = 1 HTTP request,
//   so TARGET_RPS is also the target HTTP request rate.
//   For workflow tests (realistic-*, pharmacy) 1 iteration = several HTTP requests; the
//   summary reports iterations/s and HTTP requests/s separately.

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
export const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;
export const RESULTS_DIR = (__ENV.RESULTS_DIR || '.').replace(/\/$/, '');

// Stepped capacity plan: TOTAL iterations over DURATION -> TARGET_RPS = TOTAL / DURATION.
// Never jump straight to large totals; move to the next step only when the previous one
// reached its target with 0 dropped iterations and a healthy generator (see README).
export const PHASES = {
  smoke: { rps: 1, durationSec: 30 },
  baseline: { rps: 5, durationSec: 120 },
  step1k: { total: 1000, durationSec: 60 },      //  16.67 it/s
  step5k: { total: 5000, durationSec: 120 },     //  41.67 it/s
  step10k: { total: 10000, durationSec: 120 },   //  83.33 it/s
  step20k: { total: 20000, durationSec: 180 },   // 111.11 it/s
  step50k: { total: 50000, durationSec: 300 },   // 166.67 it/s
  step100k: { total: 100000, durationSec: 600 }, // 166.67 it/s (longer soak at the same rate)
};
// Old benchmark.js phase names (500k / 1m are intentionally not provided: use the stepped plan
// or PHASE=stress once the generator capacity is known).
PHASES.validation = PHASES.step1k;
PHASES['100k'] = PHASES.step100k;

export const PHASE = __ENV.PHASE || (__ENV.TARGET_RPS !== undefined ? 'custom' : 'smoke');

function parseDurationSec(v) {
  if (v === undefined || v === '') return undefined;
  const m = String(v).match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
  if (!m) throw new Error(`Bad DURATION "${v}" (use e.g. 90s, 5m)`);
  const n = Number(m[1]);
  return m[2] === 'm' ? n * 60 : m[2] === 'h' ? n * 3600 : n;
}

// Resolve TARGET_RPS / DURATION: explicit env overrides win over the phase preset.
export function resolveLoad() {
  if (PHASE === 'stress') {
    return { stress: true };
  }
  const preset = PHASES[PHASE] || {};
  if (!PHASES[PHASE] && (__ENV.TARGET_RPS === undefined || __ENV.DURATION === undefined)) {
    throw new Error(`Unknown PHASE "${PHASE}". Use one of ${Object.keys(PHASES).join(', ')}, stress, or set TARGET_RPS and DURATION.`);
  }
  const durationSec = parseDurationSec(__ENV.DURATION) ?? preset.durationSec;
  const rps = __ENV.TARGET_RPS !== undefined ? Number(__ENV.TARGET_RPS)
    : preset.rps !== undefined ? preset.rps : preset.total / preset.durationSec;
  if (!(rps > 0) || !(durationSec > 0)) throw new Error('TARGET_RPS and DURATION must be > 0');
  return { rps, durationSec, total: Math.round(rps * durationSec) };
}

// VU sizing. k6 needs about TARGET_RPS x (iteration duration in s) busy VUs (Little's law).
// The previous generator was OOM-killed near ~700 VUs, so maxVUs is capped (VU_CAP, default 400).
// If the cap is hit, k6 drops iterations and the summary marks the run as NOT reaching target.
function vuSizing(rps, expectedIterSec) {
  const cap = Number(__ENV.VU_CAP || 400);
  const pre = __ENV.PRE_VUS ? Number(__ENV.PRE_VUS) : Math.max(5, Math.ceil(rps * expectedIterSec));
  const max = __ENV.MAX_VUS ? Number(__ENV.MAX_VUS) : Math.max(pre, Math.min(cap, Math.max(20, pre * 4)));
  return { preAllocatedVUs: Math.min(pre, max), maxVUs: max };
}

// Build the main scenario. expectedIterSec = rough duration of one iteration at low load
// (0.2 s for single requests, ~1-2 s for workflows).
export function mainScenario(execFn, expectedIterSec) {
  const load = resolveLoad();
  if (load.stress) {
    const start = Number(__ENV.START_RPS || 10);
    const max = Number(__ENV.MAX_RPS || 200);
    const step = Number(__ENV.STEP_RPS || 20);
    const ramp = __ENV.RAMP || '30s';
    const hold = __ENV.HOLD || '60s';
    const stages = [];
    for (let r = start; r <= max; r += step) {
      stages.push({ target: Math.round(r * 60), duration: ramp });
      stages.push({ target: Math.round(r * 60), duration: hold });
    }
    const sizing = vuSizing(max, expectedIterSec);
    return {
      load: { stress: true, startRps: start, maxRps: max, stepRps: step, ramp, hold },
      scenario: {
        executor: 'ramping-arrival-rate', exec: execFn, startRate: Math.round(start * 60), timeUnit: '1m',
        stages, preAllocatedVUs: sizing.preAllocatedVUs, maxVUs: sizing.maxVUs,
      },
    };
  }
  const sizing = vuSizing(load.rps, expectedIterSec);
  return {
    load,
    scenario: {
      executor: 'constant-arrival-rate', exec: execFn,
      // rate per minute keeps fractional RPS exact (e.g. 16.67 it/s = 1000 it/min).
      rate: Math.max(1, Math.round(load.rps * 60)), timeUnit: '1m',
      duration: `${load.durationSec}s`,
      preAllocatedVUs: sizing.preAllocatedVUs, maxVUs: sizing.maxVUs,
    },
  };
}

// Common options: percentiles in the summary, per-benchmark sub-metrics (tag bench=main keeps
// setup/teardown traffic out of the numbers), response bodies discarded unless a request asks
// for them (large list responses otherwise cost generator memory).
export function baseOptions(scenarios, extraThresholds = {}) {
  const errMax = Number(__ENV.ERROR_RATE_MAX || 0.01);
  const thresholds = {
    'http_req_failed{bench:main}': [`rate<${errMax}`],
    'http_req_duration{bench:main}': ['max>=0'],
    'http_reqs{bench:main}': ['count>=0'],
    dropped_iterations: ['count==0'],
    ...extraThresholds,
  };
  if (__ENV.P95_MS) thresholds['http_req_duration{bench:main}'].push(`p(95)<${Number(__ENV.P95_MS)}`);
  if (PHASE === 'stress') {
    // Stop hammering a system that is clearly failing (keeps the summary, marks the limit).
    thresholds['http_req_failed{bench:main}'] = [{ threshold: `rate<${Number(__ENV.STRESS_ABORT_ERROR_RATE || 0.05)}`, abortOnFail: true, delayAbortEval: '30s' }];
  }
  return {
    scenarios,
    thresholds,
    discardResponseBodies: true,
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
    setupTimeout: __ENV.SETUP_TIMEOUT || '300s',
    noConnectionReuse: false,
    userAgent: `hms-k6/${RUN_ID}`,
  };
}
