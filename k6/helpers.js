import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { BASE_URL } from './config.js';

// SharedArray parses tokens.json ONCE and shares it read-only across every
// VU. At 2000 tokens this matters — without SharedArray, k6 would clone the
// array into every VU's memory, which adds up fast at hundreds of VUs.
// Expects tokens.json shaped like: [{ email, role, profileId, token }, ...]
export const patientTokens = new SharedArray('patientTokens', function () {
  const all = JSON.parse(open('./tokens.json'));
  return all.filter((t) => t.role === 'PATIENT');
});
export const doctorTokens = new SharedArray('doctorTokens', function () {
  const all = JSON.parse(open('./tokens.json'));
  return all.filter((t) => t.role === 'DOCTOR');
});

if (patientTokens.length === 0) {
  throw new Error('tokens.json must contain at least one PATIENT token');
}
if (doctorTokens.length === 0) {
  throw new Error('tokens.json must contain at least one DOCTOR token');
}

export function randomPatient() {
  return patientTokens[randomIntBetween(0, patientTokens.length - 1)];
}
export function randomDoctor() {
  return doctorTokens[randomIntBetween(0, doctorTokens.length - 1)];
}

// __VU and __ITER guarantee uniqueness across every parallel VU, not just
// within one VU's own counter — required at 1M-iteration scale.
export function uniqueSignupEmail() {
  return `loadtest_${__VU}_${__ITER}_${Date.now()}@hms.com`;
}

function tagged(tags) {
  return { headers: { 'Content-Type': 'application/json' }, tags };
}
function authTagged(token, tags) {
  return {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    tags,
  };
}

// `name` MUST be a static string, never the raw interpolated URL — with
// path params like {profileId} in the URL, using the real URL as the tag
// would create a unique tag value per request and blow up k6's internal
// metric cardinality at 1M requests. Always pass a fixed `name`.
export function get(path, token, name) {
  const tags = { method: 'GET', endpoint: name, traffic_type: 'GET' };
  return http.get(`${BASE_URL}${path}`, token ? authTagged(token, tags) : tagged(tags));
}
export function post(path, body, token, name, trafficType) {
  const tags = { method: 'POST', endpoint: name, traffic_type: trafficType || 'POST' };
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), token ? authTagged(token, tags) : tagged(tags));
}
export function put(path, body, token, name) {
  const tags = { method: 'PUT', endpoint: name, traffic_type: 'PUT' };
  return http.put(`${BASE_URL}${path}`, JSON.stringify(body), authTagged(token, tags));
}

export function putNoBody(path, token, name) {
  const tags = { method: 'PUT', endpoint: name, traffic_type: 'PUT' };
  return http.put(`${BASE_URL}${path}`, null, authTagged(token, tags));
}
