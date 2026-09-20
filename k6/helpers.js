import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { BASE_URL } from './config.js';

// tokens.json is loaded once and shared read-only between VUs.
const allTokens = new SharedArray('hmsTokens', () => {
  const all = JSON.parse(open('./tokens.json'));

  if (!Array.isArray(all)) {
    throw new Error('tokens.json must contain an array');
  }

  return all;
});

export const patientTokens = allTokens.filter((t) => t.role === 'PATIENT');
export const doctorTokens = allTokens.filter((t) => t.role === 'DOCTOR');

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

export function uniqueSignupEmail() {
  // __VU + __ITER are unique within the k6 execution.
  return `loadtest_${__VU}_${__ITER}_${Date.now()}@hms.com`;
}

function jsonTags(method, endpoint, trafficType) {
  return {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      method,
      endpoint,
      traffic_type: trafficType,
    },
  };
}

function authTags(method, endpoint, trafficType, token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: {
      method,
      endpoint,
      traffic_type: trafficType,
    },
  };
}

// IMPORTANT: endpoint is a static name, never the actual URL.
// This prevents metric-cardinality explosion from profile IDs.
export function get(path, token, endpoint) {
  return http.get(
    `${BASE_URL}${path}`,
    token
      ? authTags('GET', endpoint, 'GET', token)
      : jsonTags('GET', endpoint, 'GET')
  );
}

export function post(path, body, token, endpoint, trafficType = 'POST') {
  return http.post(
    `${BASE_URL}${path}`,
    JSON.stringify(body),
    token
      ? authTags('POST', endpoint, trafficType, token)
      : jsonTags('POST', endpoint, trafficType)
  );
}

export function put(path, body, token, endpoint) {
  return http.put(
    `${BASE_URL}${path}`,
    JSON.stringify(body),
    authTags('PUT', endpoint, 'PUT', token)
  );
}

export function putNoBody(path, token, endpoint) {
  return http.put(
    `${BASE_URL}${path}`,
    null,
    authTags('PUT', endpoint, 'PUT', token)
  );
}
