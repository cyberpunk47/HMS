// ---------------------------------------------------------------------------
// Run with: k6 run -e BASE_URL=... -e PHASE=validation|100k|500k|1m benchmark.js
// TARGET_RATE is exact: total requests per TARGET_TIME_UNIT.
// Using 6s keeps k6's constant-arrival-rate `rate` integer:
//   1m -> 10,000 requests / 6s == 1,000,000 / 600s
// This is fed straight into a `constant-arrival-rate` executor — NOT ramping —
// so the math holds exactly for the "N requests" claim, per your requirement.
// ---------------------------------------------------------------------------
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:9000';

const PHASES = {
  validation: { total: 1000, durationSec: 60 },
  '100k': { total: 100000, durationSec: 600 },
  '500k': { total: 500000, durationSec: 600 },
  '1m': { total: 1000000, durationSec: 600 },
};

const phaseKey = __ENV.PHASE || 'validation';
const phase = PHASES[phaseKey];
if (!phase) {
  throw new Error(`Unknown PHASE "${phaseKey}" — use one of: validation, 100k, 500k, 1m`);
}

export const PHASE_NAME = phaseKey;
export const TARGET_TOTAL = phase.total;
export const DURATION_SEC = phase.durationSec;
export const TARGET_TIME_UNIT = '6s';
export const TARGET_TIME_UNIT_SEC = 6;
export const TARGET_RATE = TARGET_TOTAL / (DURATION_SEC / TARGET_TIME_UNIT_SEC);
export const TARGET_RATE_RPS = TARGET_TOTAL / DURATION_SEC;

// Traffic mix — must sum to 1.0.
// Your spec's "remaining 5%" is folded into GET (a broader read mix), per
// your own note that it could go to "another confirmed GET/POST workload" —
// simpler than inventing a separate ambiguous bucket. Adjust freely.
export const TRAFFIC_MIX = [
  ['GET', 0.75],
  ['POST', 0.10],
  ['PUT', 0.05],
  ['LOGIN', 0.07],
  ['SIGNUP', 0.03],
];

// Must match what's actually seeded in the DB / present in tokens.json.
export const PATIENT_COUNT = Number(__ENV.PATIENT_COUNT) || 1000;
export const DOCTOR_COUNT = Number(__ENV.DOCTOR_COUNT) || 1000;
