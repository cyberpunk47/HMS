// HMS K6 benchmark configuration
// Run:
//   k6 run -e BASE_URL=http://HMS_IP:9000 -e PHASE=validation benchmark.js
//   k6 run -e BASE_URL=http://HMS_IP:9000 -e PHASE=100k benchmark.js
//   k6 run -e BASE_URL=http://HMS_IP:9000 -e PHASE=500k benchmark.js
//   k6 run -e BASE_URL=http://HMS_IP:9000 -e PHASE=1m benchmark.js

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
  throw new Error(
    `Unknown PHASE "${phaseKey}" — use validation, 100k, 500k, or 1m`
  );
}

export const PHASE_NAME = phaseKey;
export const TARGET_TOTAL = phase.total;
export const DURATION_SEC = phase.durationSec;

// 6s keeps the arrival rate integer while preserving the exact RPS.
export const TARGET_TIME_UNIT = '6s';
export const TARGET_RATE = TARGET_TOTAL / (DURATION_SEC / 6);
export const TARGET_RATE_RPS = TARGET_TOTAL / DURATION_SEC;

// Exact benchmark mix:
// GET 75%, POST 10%, PUT 5%, LOGIN 7%, SIGNUP 3%.
export const TRAFFIC_MIX = [
  ['GET', 0.75],
  ['POST', 0.10],
  ['PUT', 0.05],
  ['LOGIN', 0.07],
  ['SIGNUP', 0.03],
];

export const PATIENT_COUNT = Number(__ENV.PATIENT_COUNT) || 1000;
export const DOCTOR_COUNT = Number(__ENV.DOCTOR_COUNT) || 1000;
