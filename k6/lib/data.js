import { SharedArray } from 'k6/data';

// Benchmark users produced by k6/seed/seed.js (never hard-coded ids: every profileId here
// was returned by the real HMS APIs during seeding).
const users = new SharedArray('bench-users', () => {
  let raw;
  try {
    raw = open('../data/bench-users.json');
  } catch (e) {
    throw new Error('k6/data/bench-users.json not found. Run: BASE_URL=... node k6/seed/seed.js');
  }
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length === 0) throw new Error('bench-users.json is empty');
  return list;
});

const metaArr = new SharedArray('bench-meta', () => {
  try { return [JSON.parse(open('../data/bench-meta.json'))]; } catch (_) { return [{}]; }
});

export const meta = metaArr[0];
export const patients = users.filter((u) => u.role === 'PATIENT');
export const doctors = users.filter((u) => u.role === 'DOCTOR');
export const admin = users.find((u) => u.role === 'ADMIN');

if (patients.length === 0 || doctors.length === 0) {
  throw new Error('bench-users.json must contain PATIENT and DOCTOR users (run the seed).');
}

// JWT TTL in UserMS is 5 hours. Refuse to start if tokens expire before the test can finish.
export function assertTokensValid(minRemainingSec) {
  const now = Math.floor(Date.now() / 1000);
  const minExp = users.reduce((m, u) => Math.min(m, u.tokenExp || 0), Infinity);
  const remaining = minExp - now;
  if (remaining < minRemainingSec) {
    throw new Error(`Benchmark JWTs expire in ${remaining}s but the test needs >= ${minRemainingSec}s. ` +
      'Refresh them: BASE_URL=... TOKENS_ONLY=1 node k6/seed/seed.js');
  }
  return remaining;
}

// Deterministic round-robin choice (no Math.random: reruns hit the same users in the same order).
export const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];
