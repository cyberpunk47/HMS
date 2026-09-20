// D. REALISTIC PATIENT WORKFLOW — mirrors what the patient UI does, in order:
//   [login]* -> own profile -> doctor list -> doctor's booked slots -> book a free 15-min slot
//   -> my appointments -> appointment details -> cancel (every 2nd journey) -> my notifications
// 1 iteration = 1 journey = 7-9 HTTP requests (*login only with LOGIN_EACH_ITERATION=true).
// TARGET_RPS here = journeys (iterations) per second; the summary reports HTTP req/s separately.
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { baseOptions, mainScenario } from './lib/config.js';
import { assertTokensValid, doctors, patients } from './lib/data.js';
import { businessRejections, errorMessage, get, post, put } from './lib/http.js';
import { allocate, baseMidnight, REASONS, slotDayOffset } from './lib/slots.js';
import { makeHandleSummary } from './lib/summary.js';

const LOGIN_EACH = String(__ENV.LOGIN_EACH_ITERATION || 'false') === 'true';
const THINK = Number(__ENV.THINK_TIME || 0); // seconds between steps (0 = back-to-back)
const PASSWORD = __ENV.BENCH_PASSWORD || 'Bench@1234';
const conflicts = new Counter('booking_slot_conflicts');

const { load, scenario } = mainScenario('journey', 1.5 + THINK * 8);
export const options = baseOptions({ main: scenario }, { booking_slot_conflicts: ['count==0'] });

export function setup() {
  assertTokensValid(load.stress ? 3600 : load.durationSec + 300);
  const offset = slotDayOffset('realistic-patient');
  return { baseMs: baseMidnight(offset) };
}

const think = () => { if (THINK > 0) sleep(THINK); };

export function journey(data) {
  const n = exec.scenario.iterationInTest;
  const a = allocate(n, patients.length, doctors.length, data.baseMs);
  const patient = patients[a.patientIndex];
  const doctor = doctors[a.doctorIndex];
  let token = patient.token;

  if (LOGIN_EACH) {
    const r = post('/users/login', { email: patient.email, password: PASSWORD }, { endpoint: 'users_login', needBody: true });
    if (r.status !== 200) return;
    token = r.body;
    think();
  }

  get(`/profile/patient/get/${patient.profileId}`, { token, endpoint: 'patient_profile_get' }); think();
  get('/profile/doctor/dropdowns', { token, endpoint: 'doctor_dropdowns' }); think();
  get(`/appointment/doctor/${doctor.profileId}/booked-slots?date=${a.date}`, { token, endpoint: 'appointment_booked_slots' }); think();

  const booked = post('/appointment/schedule', {
    doctorId: doctor.profileId, patientId: patient.profileId, appointmentTime: a.time,
    reason: REASONS[n % REASONS.length], notes: `[hmsbench] realistic-patient ${n}`,
  }, { token, endpoint: 'appointment_schedule', expect: [201], needBody: true });
  think();
  let appointmentId = null;
  if (booked.status === 201) appointmentId = Number(booked.body);
  else if (/within 15 minutes/i.test(errorMessage(booked))) { conflicts.add(1); businessRejections.add(1); }

  get(`/appointment/getAllByPatient/${patient.profileId}`, { token, endpoint: 'appointments_by_patient' }); think();

  if (appointmentId) {
    get(`/appointment/get/details/${appointmentId}`, { token, endpoint: 'appointment_details' }); think();
    if (n % 2 === 0) {
      put(`/appointment/cancel/${appointmentId}`, undefined, { token, endpoint: 'appointment_cancel' }); think();
    }
  }
  get(`/notification/patient/${patient.profileId}`, { token, endpoint: 'notifications_patient' });
}

export const handleSummary = makeHandleSummary('realistic-patient', load, {
  iterationModel: `1 iteration = 1 patient journey (${LOGIN_EACH ? '8-9' : '7-8'} HTTP requests)`,
  custom: (d) => ({ slot_conflicts: d.metrics.booking_slot_conflicts?.values?.count ?? 0, think_time_s: THINK, login_each_iteration: LOGIN_EACH }),
});
