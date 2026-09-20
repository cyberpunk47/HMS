// E. REALISTIC DOCTOR WORKFLOW — mirrors the doctor UI:
//   [login]* -> own profile -> my appointments -> my patients dropdown -> open one appointment
//   (details + patient profile + patient's reports + patient's prescriptions = medical history)
//   -> visit metrics -> notifications
// 1 iteration = 1 journey = 6-10 HTTP requests (read-heavy). Appointment/patient ids are taken
// from the doctor's own real appointment list returned by the API (never invented).
import exec from 'k6/execution';
import { sleep } from 'k6';
import { baseOptions, mainScenario } from './lib/config.js';
import { assertTokensValid, doctors } from './lib/data.js';
import { get, json, post } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';

const LOGIN_EACH = String(__ENV.LOGIN_EACH_ITERATION || 'false') === 'true';
const THINK = Number(__ENV.THINK_TIME || 0);
const PASSWORD = __ENV.BENCH_PASSWORD || 'Bench@1234';

const { load, scenario } = mainScenario('journey', 1.5 + THINK * 9);
export const options = baseOptions({ main: scenario });

export function setup() {
  assertTokensValid(load.stress ? 3600 : load.durationSec + 300);
}

const think = () => { if (THINK > 0) sleep(THINK); };

export function journey() {
  const n = exec.scenario.iterationInTest;
  const doctor = doctors[n % doctors.length];
  let token = doctor.token;

  if (LOGIN_EACH) {
    const r = post('/users/login', { email: doctor.email, password: PASSWORD }, { endpoint: 'users_login', needBody: true });
    if (r.status !== 200) return;
    token = r.body;
    think();
  }

  get(`/profile/doctor/get/${doctor.profileId}`, { token, endpoint: 'doctor_profile_get' }); think();
  const list = get(`/appointment/getAllByDoctor/${doctor.profileId}`, { token, endpoint: 'appointments_by_doctor', needBody: true });
  think();
  get(`/appointment/patients/doctor/${doctor.profileId}/dropdown`, { token, endpoint: 'doctor_patient_dropdown' }); think();

  const appts = json(list) || [];
  if (appts.length > 0) {
    const appt = appts[n % appts.length];
    get(`/appointment/get/details/${appt.id}`, { token, endpoint: 'appointment_details' }); think();
    get(`/profile/patient/get/${appt.patientId}`, { token, endpoint: 'patient_profile_get' }); think();
    get(`/appointment/report/getRecordsByPatientId/${appt.patientId}`, { token, endpoint: 'records_by_patient' }); think();
    get(`/appointment/report/getPrescriptionsByPatientId/${appt.patientId}`, { token, endpoint: 'prescriptions_by_patient' }); think();
  }
  get(`/appointment/countByDoctor/${doctor.profileId}`, { token, endpoint: 'appointment_count_by_doctor' }); think();
  get(`/notification/doctor/${doctor.profileId}`, { token, endpoint: 'notifications_doctor' });
}

export const handleSummary = makeHandleSummary('realistic-doctor', load, {
  iterationModel: '1 iteration = 1 doctor journey (5 requests, 9 when the doctor has appointments; +1 with login)',
});
