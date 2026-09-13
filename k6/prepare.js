#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';
const PATIENT_COUNT = Number(process.env.PATIENT_COUNT || 1000);
const DOCTOR_COUNT = Number(process.env.DOCTOR_COUNT || 1000);
const CONCURRENCY = Number(process.env.SETUP_CONCURRENCY || 20);
const PASSWORD = process.env.BENCHMARK_PASSWORD || 'Password@123';
const OUT_FILE = path.join(__dirname, 'tokens.json');

async function request(method, urlPath, body) {
  try {
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  } catch (err) {
    const detail = requestErrorMessage(err);
    throw new Error(`${method} ${BASE_URL}${urlPath} failed: ${detail}`);
  }
}

async function ensureUser(role, index) {
  const prefix = role === 'PATIENT' ? 'patient' : 'doctor';
  const email = `${prefix}${String(index).padStart(3, '0')}@hms.com`;
  const user = {
    name: `Benchmark ${role.toLowerCase()} ${index}`,
    email,
    password: PASSWORD,
    role,
  };

  const register = await request('POST', '/users/register', user);
  if (!register.ok && !isAlreadyExists(register.text)) {
    throw new Error(`register ${email} failed: ${register.status} ${register.text}`);
  }

  const login = await request('POST', '/users/login', { email, password: PASSWORD });
  if (!login.ok || !login.text) {
    throw new Error(`login ${email} failed: ${login.status} ${login.text}`);
  }

  const claims = decodeJwtPayload(login.text);
  return {
    email,
    role,
    profileId: claims.profileId,
    token: login.text,
  };
}

function decodeJwtPayload(token) {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('login returned an invalid JWT');
  }
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

async function main() {
  const tokens = [];

  tokens.push(...await ensureUsers('PATIENT', PATIENT_COUNT));
  tokens.push(...await ensureUsers('DOCTOR', DOCTOR_COUNT));

  fs.writeFileSync(OUT_FILE, `${JSON.stringify(tokens, null, 2)}\n`);
  process.stdout.write(`Wrote ${tokens.length} fresh JWTs to ${OUT_FILE}\n`);
}

async function ensureUsers(role, count) {
  const tokens = new Array(count);
  let next = 1;
  let completed = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, count) }, async () => {
    while (next <= count) {
      const index = next;
      next += 1;
      tokens[index - 1] = await ensureUser(role, index);
      completed += 1;
      logProgress(role.toLowerCase(), completed, count);
    }
  });
  await Promise.all(workers);
  return tokens;
}

function isAlreadyExists(text) {
  if (text.includes('USER_ALREADY_EXISTS')) {
    return true;
  }
  try {
    const body = JSON.parse(text);
    return String(body.errorMessage || '').toLowerCase().includes('already exists');
  } catch (_) {
    return text.toLowerCase().includes('already exists');
  }
}

function requestErrorMessage(err) {
  const parts = [err.message];
  if (err.cause) {
    if (Array.isArray(err.cause.errors)) {
      parts.push(...err.cause.errors.map((cause) => cause.message).filter(Boolean));
    } else if (err.cause.message) {
      parts.push(err.cause.message);
    }
  }
  return parts.filter(Boolean).join(': ');
}

function logProgress(label, current, total) {
  if (current === total || current % 50 === 0) {
    process.stdout.write(`\rPrepared ${current}/${total} ${label}`);
    if (current === total) process.stdout.write('\n');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
