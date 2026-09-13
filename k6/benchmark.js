import { check } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';
import {
  BASE_URL, PHASE_NAME, TARGET_TOTAL, DURATION_SEC, TARGET_RATE,
  TARGET_RATE_RPS, TARGET_TIME_UNIT, TRAFFIC_MIX,
} from './config.js';
import {
  patientTokens, doctorTokens, randomPatient, randomDoctor, get, post, put, putNoBody,
} from './helpers.js';
import { signupPayload, loginPayload, appointmentSchedulePayload, medicinePayload } from './payloads.js';

// ---------------------------------------------------------------------------
// EXECUTOR: constant-arrival-rate, not ramping. 1 iteration below == exactly
// 1 HTTP request, so TARGET_RATE iterations per TARGET_TIME_UNIT
// gives TARGET_TOTAL over DURATION_SEC exactly
// (e.g. 1,000,000 for PHASE=1m), PROVIDED dropped_iterations stays at 0.
// If dropped_iterations > 0 at the end, the achieved rate was below target —
// report the real number from `http_reqs`, don't report TARGET_TOTAL.
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    hms_benchmark: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RATE,
      timeUnit: TARGET_TIME_UNIT,
      duration: `${DURATION_SEC}s`,
      // Size generously — under-sizing this is the #1 cause of silent
      // dropped_iterations. Tune upward if dropped_iterations > 0.
      preAllocatedVUs: Math.max(50, Math.ceil(TARGET_RATE_RPS * 0.5)),
      maxVUs: Math.max(200, Math.ceil(TARGET_RATE_RPS * 2)),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    dropped_iterations: ['count==0'], // fails the run if the target rate wasn't actually sustained
    'http_req_duration{traffic_type:GET}': ['p(95)<800'],
    'http_req_duration{traffic_type:POST}': ['p(95)<1500'],
    'http_req_duration{traffic_type:PUT}': ['p(95)<1200'],
    'http_req_duration{traffic_type:LOGIN}': ['p(95)<500'], // real BCrypt path, small % of traffic
    'http_req_duration{traffic_type:SIGNUP}': ['p(95)<500'],
  },
};

// Per-traffic-type counters, in addition to the automatic
// http_req_duration{traffic_type:...} breakdown k6 gives you from tags.
const errorsByType = {
  GET: new Counter('errors_get'),
  POST: new Counter('errors_post'),
  PUT: new Counter('errors_put'),
  LOGIN: new Counter('errors_login'),
  SIGNUP: new Counter('errors_signup'),
};

const DISPATCH_SCALE = 100;
const TYPE_BUCKETS = buildBuckets(TRAFFIC_MIX, DISPATCH_SCALE);
const POST_APPOINTMENT_BUCKETS = 8;
const PUT_APPOINTMENT_CANCEL_BUCKETS = 4;

function buildBuckets(mix, scale) {
  let start = 0;
  return mix.map(([type, weight], index) => {
    const size = index === mix.length - 1 ? scale - start : Math.round(weight * scale);
    const bucket = { type, start, end: start + size, size };
    start += size;
    return bucket;
  });
}

function bucketFor(type) {
  return TYPE_BUCKETS.find((bucket) => bucket.type === type);
}

function expectedBucketHits(bucket, subBucketCount) {
  const fullCycles = Math.floor(TARGET_TOTAL / DISPATCH_SCALE);
  const remainder = TARGET_TOTAL % DISPATCH_SCALE;
  const hitsInPartialCycle = Math.min(Math.max(remainder - bucket.start, 0), subBucketCount);
  return fullCycles * subBucketCount + hitsInPartialCycle;
}

const PUT_BUCKET = bucketFor('PUT');
const REQUIRED_CANCEL_IDS = expectedBucketHits(PUT_BUCKET, PUT_APPOINTMENT_CANCEL_BUCKETS);
const REQUIRED_MEDICINE_UPDATE_IDS = expectedBucketHits(PUT_BUCKET, 1);

export function setup() {
  const cancelIds = [];
  const medicineIds = [];
  const token = patientTokens[0].token;

  for (let i = 0; i < REQUIRED_CANCEL_IDS; i += 1) {
    const patient = patientTokens[i % patientTokens.length];
    const doctor = doctorTokens[i % doctorTokens.length];
    const res = post(
      '/appointment/schedule',
      appointmentSchedulePayload(doctor.profileId, patient.profileId, 1000000 + i),
      patient.token,
      'setup_appointment_cancel_pool',
      'SETUP'
    );
    if (res.status !== 201 || !res.body) {
      throw new Error(`Failed to create cancellable appointment ${i + 1}/${REQUIRED_CANCEL_IDS}: ${res.status} ${res.body}`);
    }
    cancelIds.push(Number(res.body));
  }

  for (let i = 0; i < REQUIRED_MEDICINE_UPDATE_IDS; i += 1) {
    const res = post(
      '/pharmacy/medicine/add',
      medicinePayload(null, 2000000 + i),
      token,
      'setup_pharmacy_medicine_update_pool',
      'SETUP'
    );
    if (res.status < 200 || res.status >= 300 || !res.body) {
      throw new Error(`Failed to create medicine for update ${i + 1}/${REQUIRED_MEDICINE_UPDATE_IDS}: ${res.status} ${res.body}`);
    }
    medicineIds.push(Number(res.body));
  }

  return { cancelIds, medicineIds };
}

// GET endpoint pool. Path-param endpoints use a real seeded profileId from
// the pre-authenticated token pool — never a random/unverified ID.
// "getAll"/"all"-style endpoints are deliberately weighted lower — at 1000+
// seeded rows they scan the whole table on every hit, which isn't
// representative of normal per-user traffic and would skew latency numbers
// if given equal weight to a single-row lookup.
function pickGetEndpoint() {
  const patient = randomPatient();
  const doctor = randomDoctor();
  const roll = Math.random();

  if (roll < 0.15) return () => get(`/profile/patient/get/${patient.profileId}`, patient.token, 'patient_profile_get');
  if (roll < 0.30) return () => get(`/profile/doctor/get/${doctor.profileId}`, doctor.token, 'doctor_profile_get');
  if (roll < 0.40) return () => get(`/appointment/getAllByPatient/${patient.profileId}`, patient.token, 'appt_all_by_patient');
  if (roll < 0.50) return () => get(`/appointment/getAllByDoctor/${doctor.profileId}`, doctor.token, 'appt_all_by_doctor');
  if (roll < 0.57) return () => get(`/appointment/countByPatient/${patient.profileId}`, patient.token, 'appt_count_by_patient');
  if (roll < 0.64) return () => get(`/appointment/countByDoctor/${doctor.profileId}`, doctor.token, 'appt_count_by_doctor');
  if (roll < 0.69) return () => get(`/appointment/countReasonByPatient/${patient.profileId}`, patient.token, 'appt_reason_by_patient');
  if (roll < 0.74) return () => get(`/appointment/countReasonByDoctor/${doctor.profileId}`, doctor.token, 'appt_reason_by_doctor');
  if (roll < 0.79) return () => get(`/notification/patient/${patient.profileId}`, patient.token, 'notif_patient');
  if (roll < 0.84) return () => get(`/notification/doctor/${doctor.profileId}`, doctor.token, 'notif_doctor');
  if (roll < 0.88) return () => get(`/appointment/patients/doctor/${doctor.profileId}/dropdown`, doctor.token, 'appt_doctor_dropdown');
  if (roll < 0.91) return () => get(`/appointment/report/getRecordsByPatientId/${patient.profileId}`, patient.token, 'report_records_by_patient');
  if (roll < 0.94) return () => get(`/appointment/prescription/patient/${patient.profileId}`, patient.token, 'prescriptions_by_patient');
  if (roll < 0.96) return () => get('/pharmacy/medicine/getAll', patient.token, 'pharmacy_medicine_getall');
  if (roll < 0.98) return () => get('/pharmacy/inventory/getAll', patient.token, 'pharmacy_inventory_getall');
  if (roll < 0.99) return () => get('/pharmacy/sales/getAll', patient.token, 'pharmacy_sales_getall');
  return () => get('/users/getRegistrationCounts', patient.token, 'user_registration_counts');
}

function doGet() {
  const res = pickGetEndpoint()();
  const ok = check(res, { 'GET 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (!ok) errorsByType.GET.add(1);
}

function doPost() {
  const patient = randomPatient();
  const doctor = randomDoctor();
  const postOrdinal = ordinalInType('POST');
  const postSubBucket = postOrdinal % 10;
  if (postSubBucket >= POST_APPOINTMENT_BUCKETS) {
    const res = post(
      '/pharmacy/medicine/add',
      medicinePayload(null, exec.scenario.iterationInTest),
      patient.token,
      'pharmacy_medicine_add'
    );
    const ok = check(res, { 'POST 2xx/409': (r) => (r.status >= 200 && r.status < 300) || r.status === 409 });
    if (!ok) errorsByType.POST.add(1);
    return;
  }

  const res = post(
    '/appointment/schedule',
    appointmentSchedulePayload(doctor.profileId, patient.profileId),
    patient.token,
    'appointment_schedule'
  );
  const ok = check(res, { 'POST 2xx/409': (r) => (r.status >= 200 && r.status < 300) || r.status === 409 });
  if (!ok) errorsByType.POST.add(1);
}

function doPut(data) {
  const patient = randomPatient();
  const putOrdinal = ordinalInType('PUT');
  const putSubBucket = putOrdinal % 5;
  let res;

  if (putSubBucket < PUT_APPOINTMENT_CANCEL_BUCKETS) {
    const cycle = Math.floor(putOrdinal / 5);
    const cancelIndex = cycle * PUT_APPOINTMENT_CANCEL_BUCKETS + putSubBucket;
    const appointmentId = data.cancelIds[cancelIndex];
    res = putNoBody(`/appointment/cancel/${appointmentId}`, patient.token, 'appointment_cancel');
  } else {
    const updateIndex = Math.floor(putOrdinal / 5);
    const medicineId = data.medicineIds[updateIndex];
    res = put(
      '/pharmacy/medicine/update',
      medicinePayload(medicineId, 3000000 + updateIndex),
      patient.token,
      'pharmacy_medicine_update'
    );
  }

  const ok = check(res, { 'PUT 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (!ok) errorsByType.PUT.add(1);
}

function doLogin() {
  const patient = randomPatient();
  const res = post('/users/login', loginPayload(patient.email), null, 'users_login', 'LOGIN');
  const ok = check(res, { 'LOGIN 200': (r) => r.status === 200 });
  if (!ok) errorsByType.LOGIN.add(1);
}

function doSignup() {
  const res = post('/users/register', signupPayload(), null, 'users_register', 'SIGNUP');
  const ok = check(res, { 'SIGNUP 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (!ok) errorsByType.SIGNUP.add(1);
}

// Weighted dispatcher — TRAFFIC_MIX from config.js drives this, so the mix
// is defined in exactly one place.
function pickTrafficType() {
  const bucket = exec.scenario.iterationInTest % DISPATCH_SCALE;
  for (const typeBucket of TYPE_BUCKETS) {
    if (bucket >= typeBucket.start && bucket < typeBucket.end) return typeBucket.type;
  }
  return TRAFFIC_MIX[TRAFFIC_MIX.length - 1][0];
}

function ordinalInType(type) {
  const iteration = exec.scenario.iterationInTest;
  const fullCycles = Math.floor(iteration / DISPATCH_SCALE);
  const bucket = iteration % DISPATCH_SCALE;
  const typeBucket = bucketFor(type);
  const hitsBeforeThisBucket = Math.min(Math.max(bucket - typeBucket.start, 0), typeBucket.size);
  return fullCycles * typeBucket.size + hitsBeforeThisBucket;
}

export default function (data) {
  const trafficType = pickTrafficType();
  switch (trafficType) {
    case 'GET': doGet(); break;
    case 'POST': doPost(); break;
    case 'PUT': doPut(data); break;
    case 'LOGIN': doLogin(); break;
    case 'SIGNUP': doSignup(); break;
  }
}

export function handleSummary(data) {
  // Prints the numbers that actually matter for your resume/report, pulled
  // straight from k6's own metrics rather than the input parameters.
  const summary = {
    phase: PHASE_NAME,
    target_total_requests: TARGET_TOTAL,
    target_rate_rps: TARGET_RATE_RPS,
    achieved_http_reqs: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    achieved_rate_rps: data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : 0,
    dropped_iterations: data.metrics.dropped_iterations ? data.metrics.dropped_iterations.values.count : 0,
    error_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
    latency_ms: data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {},
  };
  return {
    stdout: JSON.stringify(summary, null, 2),
    [`summary-${PHASE_NAME}.json`]: JSON.stringify(data, null, 2), // full raw metrics, all tags included
  };
}

// ---------------------------------------------------------------------------
// Pharmacy sales note: deliberately NOT included in the automated write mix.
// Inventory is finite and SaleService consumes batches. The benchmark covers
// supported pharmacy GET/POST/PUT through medicine/inventory/sales reads plus
// medicine add/update writes without blindly draining stock.
// ---------------------------------------------------------------------------
