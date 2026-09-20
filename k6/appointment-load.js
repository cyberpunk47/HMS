// G. APPOINTMENT BOOKING — POST /appointment/schedule only (1 iteration = 1 HTTP request).
// Exercises: 2 Feign calls to ProfileMS, advisory locks, the 15-minute window checks, insert,
// Kafka publish (NotificationMS consumes asynchronously).
//
// Slots come from lib/slots.js: collision-free by construction, so any rejection here is a real
// signal (counted in booking_slot_conflicts, which must stay 0). Booked appointments carry
// notes "[hmsbench] ..." and are removable with k6/seed/cleanup-bench-data.sql.
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';
import { baseOptions, mainScenario } from './lib/config.js';
import { assertTokensValid, doctors, patients } from './lib/data.js';
import { businessRejections, errorMessage, post } from './lib/http.js';
import { allocate, baseMidnight, REASONS, slotDayOffset } from './lib/slots.js';
import { makeHandleSummary } from './lib/summary.js';

const conflicts = new Counter('booking_slot_conflicts');
const { load, scenario } = mainScenario('run', 0.4);
export const options = baseOptions({ main: scenario }, { booking_slot_conflicts: ['count==0'] });

if (doctors.length > patients.length) throw new Error('Need at least as many seeded patients as doctors (slot allocator).');

export function setup() {
  assertTokensValid(load.stress ? 3600 : load.durationSec + 300);
  const offset = slotDayOffset('appointment-load');
  return { baseMs: baseMidnight(offset), offsetDays: offset };
}

export function run(data) {
  const n = exec.scenario.iterationInTest;
  const a = allocate(n, patients.length, doctors.length, data.baseMs);
  const patient = patients[a.patientIndex];
  const res = post('/appointment/schedule', {
    doctorId: doctors[a.doctorIndex].profileId,
    patientId: patient.profileId,
    appointmentTime: a.time,
    reason: REASONS[n % REASONS.length],
    notes: `[hmsbench] appointment-load ${n}`,
  }, { token: patient.token, endpoint: 'appointment_schedule', expect: [201], needBody: true });
  if (res.status !== 201) {
    const msg = errorMessage(res);
    if (/within 15 minutes/i.test(msg)) { conflicts.add(1); businessRejections.add(1); }
    if (__ENV.DEBUG) console.warn(`schedule #${n} ${a.time}: ${res.status} ${msg}`);
  }
}

export const handleSummary = makeHandleSummary('appointment-load', load, {
  custom: (d) => ({ slot_conflicts: d.metrics.booking_slot_conflicts?.values?.count ?? 0 }),
});
