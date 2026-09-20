// 15-MINUTE SLOT RULE — correctness test (not a throughput benchmark).
//
// 1) setup(): deterministic boundary checks on one doctor (sequential):
//      T        -> 201            T+15m -> 201 (exactly 15 min apart is allowed)
//      T+14m    -> rejected       T-14m -> rejected       T-15m -> 201
//      same patient, other doctor, T+10m -> rejected (patient-side rule)
//      cancel T, then book T again with another patient -> 201 (cancelled slots are free)
// 2) race scenario: RACE_VUS VUs fire at the same moment for RACE_GROUPS groups. In each group
//    every VU books the SAME doctor at base+0..14 min (all pairwise < 15 min apart) with a
//    different patient. Exactly ONE booking per group may succeed; the rest must be rejected
//    by AppointmentMS (advisory lock + window check).
//
//   k6 run -e BASE_URL=... slot-conflict.js            (defaults: 20 VUs x 10 groups)
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { baseOptions, RUN_ID } from './lib/config.js';
import { assertTokensValid, doctors, patients } from './lib/data.js';
import { errorMessage, get, json, post, put } from './lib/http.js';
import { baseMidnight, formatLocal, slotDayOffset } from './lib/slots.js';
import { makeHandleSummary } from './lib/summary.js';

const RACE_VUS = Number(__ENV.RACE_VUS || 20);
const RACE_GROUPS = Number(__ENV.RACE_GROUPS || 10);
const RACE_INTERVAL_S = Number(__ENV.RACE_INTERVAL_S || 3);

const ruleOk = new Counter('slot_rule_checks_passed');
const ruleBad = new Counter('slot_rule_checks_failed');
const raceWon = new Counter('race_bookings_succeeded');
const raceRejected = new Counter('race_bookings_rejected');
const raceUnexpected = new Counter('race_unexpected_responses');

if (doctors.length < 3) throw new Error('slot-conflict needs >= 3 seeded doctors');
if (patients.length < RACE_VUS + 8) throw new Error(`slot-conflict needs >= ${RACE_VUS + 8} seeded patients`);

const load = { rps: 0, durationSec: RACE_GROUPS * RACE_INTERVAL_S + 10, total: RACE_VUS * RACE_GROUPS };
export const options = baseOptions({
  race: { executor: 'per-vu-iterations', exec: 'race', vus: RACE_VUS, iterations: RACE_GROUPS, maxDuration: `${RACE_GROUPS * RACE_INTERVAL_S + 120}s` },
}, {
  slot_rule_checks_failed: ['count==0'],
  race_bookings_succeeded: [`count==${RACE_GROUPS}`],
  race_bookings_rejected: [`count==${RACE_GROUPS * (RACE_VUS - 1)}`],
  race_unexpected_responses: ['count==0'],
  // Rejections are expected here, so only real transport/5xx-without-rule errors count as failures.
  'http_req_failed{bench:main}': ['rate<0.01'],
});
delete options.thresholds.dropped_iterations;

const MIN = 60000;
const REJECT = /within 15 minutes|already has an appointment|not available/i;

function book(patient, doctor, whenMs, tag, phase) {
  return post('/appointment/schedule', {
    doctorId: doctor.profileId, patientId: patient.profileId, appointmentTime: formatLocal(whenMs),
    reason: 'General Consultation', notes: `[hmsbench] slot-conflict ${tag}`,
  }, { token: patient.token, endpoint: 'appointment_schedule', expect: [201, 500], needBody: true, phase, expectedStatuses: [201, 500] });
}

function expectOutcome(label, res, shouldSucceed) {
  const succeeded = res.status === 201;
  const rejectedByRule = res.status === 500 && REJECT.test(errorMessage(res));
  const pass = shouldSucceed ? succeeded : rejectedByRule;
  (pass ? ruleOk : ruleBad).add(1, { check: label });
  if (!pass) console.error(`SLOT RULE CHECK FAILED: ${label} -> ${res.status} ${errorMessage(res)}`);
  return succeeded ? Number(res.body) : null;
}

export function setup() {
  assertTokensValid(600);
  const T = baseMidnight(slotDayOffset('slot-conflict')) + 10 * 60 * MIN; // 10:00 on a far-future day
  const [d0, d1] = doctors;
  const p = patients;
  const first = expectOutcome('book T', book(p[0], d0, T, 'T', 'setup'), true);
  expectOutcome('book T+15m (boundary allowed)', book(p[1], d0, T + 15 * MIN, 'T+15', 'setup'), true);
  expectOutcome('book T+14m (doctor conflict)', book(p[2], d0, T + 14 * MIN, 'T+14', 'setup'), false);
  expectOutcome('book T-14m (doctor conflict)', book(p[3], d0, T - 14 * MIN, 'T-14', 'setup'), false);
  expectOutcome('book T-15m (boundary allowed)', book(p[4], d0, T - 15 * MIN, 'T-15', 'setup'), true);
  expectOutcome('same patient, other doctor, T+10m (patient conflict)', book(p[0], d1, T + 10 * MIN, 'P0-D1', 'setup'), false);
  if (first) {
    const c = put(`/appointment/cancel/${first}`, undefined, { token: p[0].token, endpoint: 'appointment_cancel', phase: 'setup' });
    (c.status === 200 ? ruleOk : ruleBad).add(1, { check: 'cancel T' });
    expectOutcome('re-book cancelled slot T', book(p[5], d0, T, 'T-rebook', 'setup'), true);
  } else {
    ruleBad.add(1, { check: 'cancel T (no appointment)' });
  }
  const raceBase = T + 24 * 60 * MIN; // next day, away from the boundary checks
  return { raceBase, startAt: Date.now() + 3000 };
}

export function race(data) {
  const vu = exec.vu.idInTest - 1;                 // 0..RACE_VUS-1
  const g = exec.vu.iterationInScenario;           // group index
  // Poor man's barrier: all VUs start group g at the same wall-clock instant.
  const wait = data.startAt + g * RACE_INTERVAL_S * 1000 - Date.now();
  if (wait > 0) sleep(wait / 1000);
  const doctor = doctors[2 + (g % (doctors.length - 2))];
  const patient = patients[8 + vu];                // distinct patient per VU
  const when = data.raceBase + g * 60 * MIN + (vu % 15) * MIN; // all within 0..14 min of group base
  const res = book(patient, doctor, when, `race-${RUN_ID}-g${g}-v${vu}`, 'main');
  if (res.status === 201) raceWon.add(1);
  else if (res.status === 500 && REJECT.test(errorMessage(res))) raceRejected.add(1);
  else { raceUnexpected.add(1); console.error(`race g${g} v${vu}: unexpected ${res.status} ${errorMessage(res)}`); }
}

export function teardown(data) {
  // Cross-check through the read API: each race group's doctor must hold exactly 1 active slot.
  const admin = patients[0];
  for (let g = 0; g < RACE_GROUPS; g++) {
    const doctor = doctors[2 + (g % (doctors.length - 2))];
    const from = data.raceBase + g * 60 * MIN;
    const res = get(`/appointment/doctor/${doctor.profileId}/booked-slots?date=${formatLocal(from).slice(0, 10)}`,
      { token: admin.token, endpoint: 'appointment_booked_slots', needBody: true, phase: 'setup' });
    const times = (json(res) || []).filter((t) => { const ms = Date.parse(`${t}Z`); return ms >= from && ms < from + 15 * MIN; });
    (times.length === 1 ? ruleOk : ruleBad).add(1, { check: `race group ${g} has exactly one booking` });
    if (times.length !== 1) console.error(`race group ${g}: ${times.length} active bookings in the window (expected 1)`);
  }
}

export const handleSummary = makeHandleSummary('slot-conflict', load, {
  iterationModel: `${RACE_VUS} VUs x ${RACE_GROUPS} simultaneous booking groups (correctness test, no target rate)`,
  fixedVus: true,
  custom: (d) => ({
    rule_checks_passed: d.metrics.slot_rule_checks_passed?.values?.count ?? 0,
    rule_checks_failed: d.metrics.slot_rule_checks_failed?.values?.count ?? 0,
    race_groups: RACE_GROUPS,
    race_succeeded_expected: RACE_GROUPS,
    race_succeeded: d.metrics.race_bookings_succeeded?.values?.count ?? 0,
    race_rejected: d.metrics.race_bookings_rejected?.values?.count ?? 0,
    race_unexpected: d.metrics.race_unexpected_responses?.values?.count ?? 0,
  }),
});
