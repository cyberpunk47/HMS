// A. API THROUGHPUT — steady-state authenticated GET traffic through the Gateway.
// 1 iteration = exactly 1 HTTP request. Pre-authenticated JWTs from the seed (no login here).
//
//   k6 run -e BASE_URL=http://HOST:9000 -e PHASE=smoke api-load.js
//   k6 run -e BASE_URL=... -e PHASE=step5k api-load.js
//   k6 run -e BASE_URL=... -e TARGET_RPS=50 -e DURATION=3m api-load.js
import exec from 'k6/execution';
import { baseOptions, mainScenario } from './lib/config.js';
import { assertTokensValid, doctors, patients, pick } from './lib/data.js';
import { get } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';
import { baseMidnight, formatLocal } from './lib/slots.js';

const { load, scenario } = mainScenario('run', 0.2);
export const options = baseOptions({ main: scenario });

// Deterministic weighted mix (weights sum to 100). Every URL/id comes from seeded data, and every
// request uses a token that is ALLOWED by the Gateway access policy (own data / public directory).
const MIX = [
  [15, 'patient_profile_get', (p) => [`/profile/patient/get/${p.profileId}`, p.token]],
  [10, 'doctor_profile_get', (p, d) => [`/profile/doctor/get/${d.profileId}`, d.token]],
  [14, 'appointments_by_patient', (p) => [`/appointment/getAllByPatient/${p.profileId}`, p.token]],
  [8, 'appointments_by_doctor', (p, d) => [`/appointment/getAllByDoctor/${d.profileId}`, d.token]],
  [8, 'appointment_count_by_patient', (p) => [`/appointment/countByPatient/${p.profileId}`, p.token]],
  [5, 'appointment_reasons_by_doctor', (p, d) => [`/appointment/countReasonByDoctor/${d.profileId}`, d.token]],
  [10, 'records_by_patient', (p) => [`/appointment/report/getRecordsByPatientId/${p.profileId}`, p.token]],
  [7, 'prescriptions_by_patient', (p) => [`/appointment/report/getPrescriptionsByPatientId/${p.profileId}`, p.token]],
  [8, 'notifications_patient', (p) => [`/notification/patient/${p.profileId}`, p.token]],
  [5, 'doctor_dropdowns', (p) => ['/profile/doctor/dropdowns', p.token]],
  [5, 'appointment_booked_slots', (p, d, day) => [`/appointment/doctor/${d.profileId}/booked-slots?date=${day}`, p.token]],
  [5, 'pharmacy_medicine_getall', (p, d) => ['/pharmacy/medicine/getAll', d.token]], // ADMIN/DOCTOR only
];
const BUCKETS = [];
MIX.forEach(([w, name, fn]) => { for (let i = 0; i < w; i++) BUCKETS.push([name, fn]); });
if (BUCKETS.length !== 100) throw new Error(`api-load mix weights must sum to 100 (got ${BUCKETS.length})`);

const TODAY = formatLocal(baseMidnight(0)).slice(0, 10);

export function setup() {
  const need = load.stress ? 3600 : load.durationSec + 300;
  return { tokenSecondsLeft: assertTokensValid(need) };
}

export function run() {
  const n = exec.scenario.iterationInTest;
  const [endpoint, fn] = BUCKETS[n % 100];
  const [path, token] = fn(pick(patients, n), pick(doctors, Math.floor(n / 7)), TODAY);
  get(path, { token, endpoint });
}

export const handleSummary = makeHandleSummary('api-load', load);
