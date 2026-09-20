// ACCESS CONTROL — security regression test (not a throughput benchmark).
// Uses the seeded users and checks that the Gateway policy allows own data and rejects the rest:
//   - no token / token signed with another secret         -> 401
//   - patient -> another patient's profile / appointments -> 403
//   - patient -> doctor-only / admin-only endpoints       -> 403
//   - doctor  -> patient without an appointment with them  -> 403
//   - doctor  -> their own patient (from their appointment list) -> 200
//   - spoofed X-User-Role / X-Profile-Id headers are ignored
//
//   k6 run -e BASE_URL=http://HOST:9000 access-control.js
import { Counter } from 'k6/metrics';
import { baseOptions, BASE_URL } from './lib/config.js';
import { admin, assertTokensValid, doctors, patients } from './lib/data.js';
import { json, request } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';
import http from 'k6/http';

const passed = new Counter('access_checks_passed');
const failed = new Counter('access_checks_failed');

export const options = baseOptions({
  checks: { executor: 'shared-iterations', exec: 'run', vus: 1, iterations: 1, maxDuration: '2m' },
}, { access_checks_failed: ['count==0'], access_checks_passed: ['count>0'] });
delete options.thresholds.dropped_iterations;
options.thresholds['http_req_failed{bench:main}'] = ['rate<=1']; // 4xx are the expected answers here

function expectStatus(label, method, path, token, expected, body) {
  const res = request(method, path, {
    token, body, endpoint: 'access_control', expect: [expected], needBody: true,
    expectedStatuses: [200, 201, 401, 403],
  });
  const ok = res.status === expected;
  (ok ? passed : failed).add(1, { check: label });
  if (!ok) console.error(`ACCESS CHECK FAILED: ${label}: ${method} ${path} -> ${res.status} (expected ${expected}) ${res.body ? String(res.body).slice(0, 150) : ''}`);
  return res;
}

export function run() {
  assertTokensValid(120);
  const p0 = patients[0];
  const p1 = patients[1];
  const d0 = doctors[0];

  // 401: missing / foreign-signed token (same claims, different secret)
  expectStatus('no token', 'GET', `/profile/patient/get/${p0.profileId}`, null, 401);
  const parts = p0.token.split('.');
  const forged = `${parts[0]}.${parts[1]}.${parts[2].split('').reverse().join('')}`;
  expectStatus('token with wrong signature', 'GET', `/profile/patient/get/${p0.profileId}`, forged, 401);

  // patient boundaries
  expectStatus('patient -> own profile', 'GET', `/profile/patient/get/${p0.profileId}`, p0.token, 200);
  expectStatus('patient -> other patient profile', 'GET', `/profile/patient/get/${p1.profileId}`, p0.token, 403);
  expectStatus('patient -> other patient appointments', 'GET', `/appointment/getAllByPatient/${p1.profileId}`, p0.token, 403);
  expectStatus('patient -> other patient records', 'GET', `/appointment/report/getRecordsByPatientId/${p1.profileId}`, p0.token, 403);
  expectStatus('patient -> doctor appointment list', 'GET', `/appointment/getAllByDoctor/${d0.profileId}`, p0.token, 403);
  expectStatus('patient -> all patients', 'GET', '/profile/patient/getAll', p0.token, 403);
  expectStatus('patient -> admin appointments', 'GET', '/appointment/all', p0.token, 403);
  expectStatus('patient -> pharmacy sales', 'GET', '/pharmacy/sales/getAll', p0.token, 403);
  expectStatus('patient -> doctor directory', 'GET', `/profile/doctor/get/${d0.profileId}`, p0.token, 200);
  expectStatus('patient -> book for another patient', 'POST', '/appointment/schedule', p0.token, 403, {
    doctorId: d0.profileId, patientId: p1.profileId, appointmentTime: '2099-01-01T10:00:00',
    reason: 'General Consultation', notes: '[hmsbench] access-control (must be rejected)',
  });

  // spoofed identity headers must be ignored
  const spoof = http.get(`${BASE_URL}/profile/patient/get/${p1.profileId}`, {
    headers: { Authorization: `Bearer ${p0.token}`, 'X-User-Role': 'ADMIN', 'X-Profile-Id': String(p1.profileId), 'X-Secret-Key': 'SECRET' },
    tags: { endpoint: 'access_control', name: 'access_control', bench: 'main' },
    responseCallback: http.expectedStatuses(200, 403),
  });
  (spoof.status === 403 ? passed : failed).add(1, { check: 'spoofed headers ignored' });
  if (spoof.status !== 403) console.error(`ACCESS CHECK FAILED: spoofed headers -> ${spoof.status}`);

  // doctor boundaries: related patients come from the doctor's own appointment list
  expectStatus('doctor -> another doctor list', 'GET', `/appointment/getAllByDoctor/${doctors[1].profileId}`, d0.token, 403);
  expectStatus('doctor -> all patients', 'GET', '/profile/patient/getAll', d0.token, 403);
  const own = json(expectStatus('doctor -> own appointments', 'GET', `/appointment/getAllByDoctor/${d0.profileId}`, d0.token, 200)) || [];
  const related = new Set(own.map((a) => a.patientId));
  const unrelated = patients.find((p) => !related.has(p.profileId));
  if (unrelated) expectStatus('doctor -> unrelated patient', 'GET', `/profile/patient/get/${unrelated.profileId}`, d0.token, 403);
  if (own.length) {
    expectStatus('doctor -> own patient profile', 'GET', `/profile/patient/get/${own[0].patientId}`, d0.token, 200);
    expectStatus('doctor -> own patient history', 'GET', `/appointment/report/getRecordsByPatientId/${own[0].patientId}`, d0.token, 200);
  } else {
    console.warn('doctors[0] has no appointments yet: run the seed / a booking test to cover the related-patient case');
  }

  // admin
  if (admin) {
    expectStatus('admin -> admin appointments', 'GET', '/appointment/all?page=0&size=5', admin.token, 200);
    expectStatus('admin -> all patients', 'GET', '/profile/patient/getAll', admin.token, 200);
  }
}

export const handleSummary = makeHandleSummary('access-control', { rps: 0 }, {
  iterationModel: 'functional security checks (no target rate)', fixedVus: true,
  custom: (d) => ({ passed: d.metrics.access_checks_passed?.values?.count ?? 0, failed: d.metrics.access_checks_failed?.values?.count ?? 0 }),
});
