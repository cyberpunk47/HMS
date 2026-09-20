#!/usr/bin/env node
/*
 * HMS benchmark seed — idempotent, deterministic, goes ONLY through the public Gateway API.
 *
 * Nothing is inserted into the database directly: every record is created by the real
 * UserMS / ProfileMS / AppointmentMS / PharmacyMS business logic, so all benchmark data
 * is valid "real" data (BCrypt passwords, profiles, 15-minute slot rule, prescriptions...).
 *
 * Every benchmark record is identifiable:
 *   users/profiles   email  bench.<role>.<nnnnn>@hmsbench.local   (name "Bench ...")
 *   doctors          licenseNo BENCH-LIC-<nnnnn>
 *   appointments     notes start with "[hmsbench]"
 *   medicines        name starts with "HMSBENCH "
 *   inventory        batchNo starts with "HMSBENCH-"
 *   sales            buyerName starts with "HMSBENCH"
 * (k6/seed/cleanup-bench-data.sql removes exactly these rows and nothing else.)
 *
 * Re-running is safe: existing users are logged in instead of re-created, profiles are
 * re-written with the same deterministic values, existing medicines/batches are reused and
 * a patient's history visit is only created if that patient has no "[hmsbench]" report yet.
 *
 * Usage (Node 18+; no npm dependencies):
 *   BASE_URL=http://localhost:9000 node k6/seed/seed.js            # full seed + fresh tokens
 *   BASE_URL=http://localhost:9000 TOKENS_ONLY=1 node k6/seed/seed.js   # only refresh JWTs (5 h TTL)
 *
 * Environment (defaults in brackets):
 *   BENCH_PATIENTS [200]  BENCH_DOCTORS [50]  BENCH_MEDICINES [20]  BENCH_HISTORY_VISITS [30]
 *   BENCH_PASSWORD [Bench@1234]  SEED_CONCURRENCY [8]  BENCH_MIN_STOCK [50000]
 *   BENCH_TZ_OFFSET_MINUTES [330]  (business time zone of AppointmentMS, Asia/Kolkata = +330)
 *   BENCH_ADMIN_EMAIL / BENCH_ADMIN_PASSWORD  existing admin to use when the DB already has one
 *     (ADMIN self-registration is only allowed for the very first admin)
 *
 * Output (git-ignored):
 *   k6/data/bench-users.json  [{ email, role, userId, profileId, token, tokenExp }]
 *   k6/data/bench-meta.json   { generatedAt, baseUrl, counts, medicines, prescriptionPool, ... }
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
let PATIENTS = int('BENCH_PATIENTS', 200);
let DOCTORS = int('BENCH_DOCTORS', 50);
const MEDICINES = int('BENCH_MEDICINES', 20);
const HISTORY_VISITS = int('BENCH_HISTORY_VISITS', 30);
const PASSWORD = process.env.BENCH_PASSWORD || 'Bench@1234';
const CONCURRENCY = int('SEED_CONCURRENCY', 8);
const MIN_STOCK = int('BENCH_MIN_STOCK', 50000);
const TZ_OFFSET_MIN = int('BENCH_TZ_OFFSET_MINUTES', 330);
const TOKENS_ONLY = ['1', 'true', 'yes'].includes(String(process.env.TOKENS_ONLY || '').toLowerCase());

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'bench-users.json');
const META_FILE = path.join(DATA_DIR, 'bench-meta.json');

const MARK = '[hmsbench]';
const PASSWORD_RULE = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=\S+$).{8,15}$/;

function int(name, def) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : def;
}

const pad = (n, w = 5) => String(n).padStart(w, '0');
const benchEmail = (role, i) => `bench.${role.toLowerCase()}.${pad(i)}@hmsbench.local`;

// ------------------------------------------------------------------ HTTP
async function call(method, urlPath, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${urlPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`${method} ${urlPath}: network error: ${err.cause?.message || err.message}`);
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* plain text (e.g. JWT) */ }
  return { status: res.status, ok: res.ok, text, json };
}

function errMsg(r) {
  return (r.json && (r.json.errorMessage || r.json.message)) || r.text || `HTTP ${r.status}`;
}

async function must(method, urlPath, opts, what) {
  const r = await call(method, urlPath, opts);
  if (!r.ok) throw new Error(`${what || `${method} ${urlPath}`} failed: ${r.status} ${errMsg(r)}`);
  return r;
}

async function pool(items, worker, label) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      done++;
      if (label && (done % 25 === 0 || done === items.length)) {
        process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
        if (done === items.length) process.stdout.write('\n');
      }
    }
  });
  await Promise.all(runners);
  return results;
}

function decodeJwt(token) {
  const part = token.split('.')[1];
  if (!part) throw new Error('login did not return a JWT');
  return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

// ------------------------------------------------------------------ deterministic profile data
const BLOOD = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];
const ALLERGIES = [[], ['Penicillin'], [], ['Peanuts'], [], ['Dust', 'Pollen'], [], ['Sulfa drugs']];
const CHRONIC = [[], [], ['Hypertension'], [], ['Type 2 Diabetes'], [], ['Asthma'], []];
const SPECIALIZATIONS = [
  ['General Practitioner', 'General Medicine'], ['Cardiologist', 'Cardiology'], ['Neurologist', 'Neurology'],
  ['Pediatrician', 'Pediatrics'], ['Orthopedic Surgeon', 'Orthopedics'], ['Dermatologist', 'Dermatology'],
  ['Endocrinologist', 'Endocrinology'], ['Psychiatrist', 'Psychiatry'],
];
const CITIES = ['Pune', 'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Jaipur'];

function dob(i, minAge, spread) {
  const year = new Date().getUTCFullYear() - (minAge + (i * 7) % spread);
  return `${year}-${pad(1 + (i % 12), 2)}-${pad(1 + (i % 28), 2)}`;
}

function patientProfile(i, u) {
  return {
    id: u.profileId,
    name: `Bench Patient ${pad(i)}`,
    email: u.email,
    dob: dob(i, 18, 60),
    phone: `9${pad(100000000 + i, 9)}`,
    address: `${i} Benchmark Street, ${CITIES[i % CITIES.length]}`,
    aadharNo: `90000${pad(i, 7)}`,
    bloodGroup: BLOOD[i % BLOOD.length],
    gender: i % 2 ? 'Male' : 'Female',
    // Same storage format as the Patient Profile page: JSON array string (or null).
    allergies: ALLERGIES[i % ALLERGIES.length].length ? JSON.stringify(ALLERGIES[i % ALLERGIES.length]) : null,
    chronicDesease: CHRONIC[i % CHRONIC.length].length ? JSON.stringify(CHRONIC[i % CHRONIC.length]) : null,
  };
}

function doctorProfile(i, u) {
  const [specialization, department] = SPECIALIZATIONS[i % SPECIALIZATIONS.length];
  return {
    id: u.profileId,
    name: `Bench Doctor ${pad(i)}`,
    email: u.email,
    dob: dob(i, 30, 30),
    phone: `8${pad(100000000 + i, 9)}`,
    address: `${i} Clinic Road, ${CITIES[i % CITIES.length]}`,
    licenseNo: `BENCH-LIC-${pad(i)}`,
    gender: i % 2 ? 'Female' : 'Male',
    specialization,
    department,
    totalExp: 3 + (i % 25),
  };
}

const MEDICINE_CATALOG = [
  ['Paracetamol', '500mg', 'ANALGESICS', 'TABLET', 2], ['Amoxicillin', '250mg', 'ANTIBIOTICS', 'CAPSULE', 8],
  ['Cetirizine', '10mg', 'ANTIHISTAMINES', 'TABLET', 3], ['Metformin', '500mg', 'ANTIDIABETICS', 'TABLET', 4],
  ['Amlodipine', '5mg', 'ANTIHYPERTENSIVES', 'TABLET', 5], ['Omeprazole', '20mg', 'ANTACIDS', 'CAPSULE', 6],
  ['Salbutamol', '100mcg', 'BRONCHODILATORS', 'INHALER', 120], ['Ibuprofen', '400mg', 'ANTIINFLAMMATORY', 'TABLET', 3],
  ['Atorvastatin', '10mg', 'STATINS', 'TABLET', 9], ['Azithromycin', '500mg', 'ANTIBIOTICS', 'TABLET', 20],
  ['Ondansetron', '4mg', 'ANTIEMETICS', 'TABLET', 7], ['Vitamin D3', '60000IU', 'VITAMINS', 'CAPSULE', 30],
  ['ORS', '21g', 'REHYDRATION', 'POWDER', 15], ['Dextromethorphan', '10ml', 'ANTITUSSIVES', 'SYRUP', 60],
  ['Levocetirizine', '5mg', 'ANTIALLERGICS', 'TABLET', 4], ['Pantoprazole', '40mg', 'ANTACIDS', 'TABLET', 7],
  ['Losartan', '50mg', 'ANTIHYPERTENSIVES', 'TABLET', 6], ['Montelukast', '10mg', 'ANTIALLERGICS', 'TABLET', 11],
  ['Hydrocortisone', '1%', 'DERMATOLOGICAL', 'CREAM', 45], ['Folic Acid', '5mg', 'SUPPLEMENTS', 'TABLET', 2],
];

const REASONS = ['General Consultation', 'Routine Check-up', 'Follow-up Visit', 'Chronic Disease Management', 'Blood Test'];
const DIAGNOSES = ['Viral fever', 'Seasonal allergy', 'Hypertension follow-up', 'Type 2 diabetes review', 'Acute gastritis', 'Upper respiratory infection'];
const SYMPTOMS = [['Fever', 'Headache'], ['Cough', 'Sore throat'], ['Fatigue'], ['Headache'], ['Muscle pain', 'Fatigue'], ['Cough']];
const TESTS = [['Complete Blood Count (CBC)'], [], ['Blood Sugar Test'], ['Lipid Profile'], [], ['Urine Test']];
const FREQUENCIES = ['1-0-1', '1-1-1', '0-0-1', '1-0-0'];

// ------------------------------------------------------------------ business-time helpers
// AppointmentMS interprets appointment times as wall-clock time in its business zone.
function businessNow() {
  return new Date(Date.now() + TZ_OFFSET_MIN * 60000); // read with getUTC* = business wall clock
}
function fmtLocal(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}T${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:00`;
}

// ------------------------------------------------------------------ users
// Admin used for pharmacy seed data and the pharmacy test. Registering an ADMIN is only allowed
// while no admin exists (first-time bootstrap) or by an existing admin, so on a database that
// already has an admin pass BENCH_ADMIN_EMAIL / BENCH_ADMIN_PASSWORD of that account.
async function ensureAdmin() {
  const email = process.env.BENCH_ADMIN_EMAIL;
  if (email) {
    const password = process.env.BENCH_ADMIN_PASSWORD || PASSWORD;
    const login = await must('POST', '/users/login', { body: { email, password } }, `login admin ${email}`);
    const token = login.text.trim();
    const claims = decodeJwt(token);
    if (claims.role !== 'ADMIN') throw new Error(`${email} is not an ADMIN account (role ${claims.role})`);
    return { index: 0, email, role: 'ADMIN', userId: claims.id, profileId: null, token, tokenExp: claims.exp };
  }
  try {
    return await ensureUser('ADMIN', 0);
  } catch (err) {
    if (/only be created by an existing admin/i.test(err.message)) {
      throw new Error('This HMS already has an admin, so bench.admin@hmsbench.local cannot self-register. ' +
        'Re-run with BENCH_ADMIN_EMAIL=<existing admin email> BENCH_ADMIN_PASSWORD=<password>.');
    }
    throw err;
  }
}

async function ensureUser(role, i) {
  const email = role === 'ADMIN' ? 'bench.admin@hmsbench.local' : benchEmail(role, i);
  const name = role === 'ADMIN' ? 'Bench Admin' : `Bench ${role === 'PATIENT' ? 'Patient' : 'Doctor'} ${pad(i)}`;

  let login = await call('POST', '/users/login', { body: { email, password: PASSWORD } });
  if (!login.ok) {
    if (TOKENS_ONLY) throw new Error(`login ${email} failed (${login.status} ${errMsg(login)}). Run the full seed first.`);
    const reg = await call('POST', '/users/register', { body: { name, email, password: PASSWORD, role } });
    if (!reg.ok && !/already exists/i.test(errMsg(reg))) {
      throw new Error(`register ${email} failed: ${reg.status} ${errMsg(reg)}`);
    }
    login = await must('POST', '/users/login', { body: { email, password: PASSWORD } }, `login ${email}`);
  }
  const token = login.text.trim();
  const claims = decodeJwt(token);
  if (role !== 'ADMIN' && (claims.profileId === null || claims.profileId === undefined)) {
    throw new Error(`login ${email}: JWT has no profileId`);
  }
  return { index: i, email, role, userId: claims.id, profileId: claims.profileId ?? null, token, tokenExp: claims.exp };
}

// ------------------------------------------------------------------ pharmacy
async function ensureMedicines(adminToken) {
  const wanted = MEDICINE_CATALOG.slice(0, Math.min(MEDICINES, MEDICINE_CATALOG.length));
  const all = (await must('GET', '/pharmacy/medicine/getAll', { token: adminToken })).json || [];
  const find = (name, dosage) => all.find((m) => m.name?.toLowerCase() === name.toLowerCase() && m.dosage?.toLowerCase() === dosage.toLowerCase());
  const meds = [];
  for (const [base, dosage, category, type, price] of wanted) {
    const name = `HMSBENCH ${base}`;
    let med = find(name, dosage);
    if (!med) {
      const r = await call('POST', '/pharmacy/medicine/add', {
        token: adminToken,
        body: { name, dosage, category, type, manufacturer: 'HMS Bench Pharma', unitPrice: price, description: 'Benchmark medicine', notes: MARK },
      });
      if (!r.ok && !/already exists/i.test(errMsg(r))) throw new Error(`add medicine ${name}: ${r.status} ${errMsg(r)}`);
      const fresh = (await must('GET', '/pharmacy/medicine/getAll', { token: adminToken })).json || [];
      med = fresh.find((m) => m.name === name && m.dosage === dosage);
      if (!med) throw new Error(`medicine ${name} not found after add`);
    }
    meds.push({ id: med.id, name: med.name, dosage: med.dosage, type: med.type, unitPrice: med.unitPrice });
  }

  // Stock: keep at least MIN_STOCK active, non-expired units per benchmark medicine.
  const today = fmtLocal(businessNow()).slice(0, 10);
  const inventory = (await must('GET', '/pharmacy/inventory/getAll', { token: adminToken })).json || [];
  for (const med of meds) {
    const active = inventory
      .filter((b) => b.medicineId === med.id && b.status === 'ACTIVE' && b.expiryDate > today)
      .reduce((sum, b) => sum + (b.quantity || 0), 0);
    if (active < MIN_STOCK) {
      const expiry = new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10);
      await must('POST', '/pharmacy/inventory/add', {
        token: adminToken,
        body: { medicineId: med.id, batchNo: `HMSBENCH-${med.id}-${today.replace(/-/g, '')}-${Date.now() % 100000}`, quantity: MIN_STOCK * 2, expiryDate: expiry },
      }, `add stock for ${med.name}`);
    }
  }
  return meds;
}

// ------------------------------------------------------------------ history visits (real completed visits)
// A visit is created exactly like the UI does it: schedule a slot inside the next hour, then the
// doctor submits a report + prescription (AppointmentMS marks it COMPLETED). Only patients that do
// not have a "[hmsbench]" report yet get one, so re-running the seed does not pile up visits.
async function ensureHistory(patients, doctors, meds) {
  const count = Math.min(HISTORY_VISITS, patients.length);
  const created = [];
  const now = businessNow();
  const slotBase = new Date(now);
  slotBase.setUTCSeconds(0, 0);
  slotBase.setUTCMinutes(Math.ceil((slotBase.getUTCMinutes() + 1) / 15) * 15); // next quarter hour
  // Candidate start times within the next hour (completion is allowed up to now + 1 h).
  const candidates = [0, 15, 30].map((m) => new Date(slotBase.getTime() + m * 60000))
    .filter((d) => d.getTime() - now.getTime() <= 55 * 60000);

  let doctorCursor = 0;
  for (let k = 0; k < count; k++) {
    const p = patients[k];
    const existing = await call('GET', `/appointment/report/getRecordsByPatientId/${p.profileId}`, { token: p.token });
    if (existing.ok && (existing.json || []).some((r) => (r.notes || '').includes(MARK))) continue;

    let appointmentId = null;
    let doctor = null;
    for (let attempt = 0; attempt < doctors.length * candidates.length && !appointmentId; attempt++) {
      doctor = doctors[(doctorCursor + Math.floor(attempt / candidates.length)) % doctors.length];
      const when = candidates[attempt % candidates.length];
      const r = await call('POST', '/appointment/schedule', {
        token: p.token,
        body: { doctorId: doctor.profileId, patientId: p.profileId, appointmentTime: fmtLocal(when), reason: REASONS[k % REASONS.length], notes: `${MARK} seeded history visit` },
      });
      if (r.ok) appointmentId = Number(r.text);
      else if (!/within 15 minutes|already has an appointment/i.test(errMsg(r))) throw new Error(`schedule history visit: ${r.status} ${errMsg(r)}`);
    }
    doctorCursor++;
    if (!appointmentId) { console.warn(`  no free slot in the next hour for patient ${p.email}; skipped`); continue; }

    const m1 = meds[k % meds.length];
    const m2 = meds[(k + 3) % meds.length];
    const report = {
      appointmentId,
      patientId: p.profileId,
      doctorId: doctor.profileId,
      symptoms: SYMPTOMS[k % SYMPTOMS.length],
      tests: TESTS[k % TESTS.length],
      diagnosis: DIAGNOSES[k % DIAGNOSES.length],
      referral: k % 4 === 0 ? 'Cardiology' : '',
      notes: `${MARK} seeded report`,
      followUpDate: new Date(Date.now() + (14 + k % 14) * 86400000).toISOString().slice(0, 10),
      prescription: {
        notes: `${MARK} seeded prescription`,
        medicines: [m1, m2].map((m, j) => ({
          name: m.name, medicineId: m.id, dosage: m.dosage, type: m.type,
          frequency: FREQUENCIES[(k + j) % FREQUENCIES.length], duration: 3 + ((k + j) % 5),
          route: 'Oral', instructions: j === 0 ? 'After food' : 'Before sleep',
        })),
      },
    };
    const doctorUser = doctor;
    await must('POST', '/appointment/report/create', { token: doctorUser.token, body: report }, `create report for appointment ${appointmentId}`);
    created.push(appointmentId);
  }
  return created;
}

// ------------------------------------------------------------------ main
async function main() {
  if (!PASSWORD_RULE.test(PASSWORD)) throw new Error('BENCH_PASSWORD does not satisfy the UserMS password rule (8-15 chars, digit, lower, upper, special).');
  if (DOCTORS > PATIENTS) console.warn('WARNING: BENCH_DOCTORS > BENCH_PATIENTS — the k6 slot allocator needs patients >= doctors to avoid patient-side slot conflicts.');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (_) { /* first run */ }
  // Token refresh re-uses the user counts of the last full seed unless overridden.
  if (TOKENS_ONLY && meta.counts) {
    if (process.env.BENCH_PATIENTS === undefined) PATIENTS = meta.counts.patients;
    if (process.env.BENCH_DOCTORS === undefined) DOCTORS = meta.counts.doctors;
  }
  const t0 = Date.now();
  console.log(`HMS seed → ${BASE_URL}  (patients=${PATIENTS}, doctors=${DOCTORS}, medicines=${MEDICINES}, history=${HISTORY_VISITS}${TOKENS_ONLY ? ', TOKENS_ONLY' : ''})`);

  const admin = await ensureAdmin();
  const patients = await pool(Array.from({ length: PATIENTS }, (_, k) => k + 1), (i) => ensureUser('PATIENT', i), 'patients');
  const doctors = await pool(Array.from({ length: DOCTORS }, (_, k) => k + 1), (i) => ensureUser('DOCTOR', i), 'doctors');

  if (!TOKENS_ONLY) {
    await pool(patients, (u) => must('PUT', '/profile/patient/update', { token: u.token, body: patientProfile(u.index, u) }, `profile ${u.email}`), 'patient profiles');
    await pool(doctors, (u) => must('PUT', '/profile/doctor/update', { token: u.token, body: doctorProfile(u.index, u) }, `profile ${u.email}`), 'doctor profiles');

    console.log('  pharmacy medicines + stock...');
    const meds = await ensureMedicines(admin.token);

    console.log('  history visits (report + prescription)...');
    const newVisits = await ensureHistory(patients, doctors, meds);

    meta = {
      ...meta,
      seedGeneratedAt: new Date().toISOString(),
      medicines: meds,
      historyVisitsCreatedThisRun: newVisits.length,
    };
  }

  // Prescription pool for the pharmacy workflow: "[hmsbench]" prescriptions that have no sale yet.
  // Refreshed on every run (also TOKENS_ONLY) because each pharmacy test consumes part of it.
  const sales = (await must('GET', '/pharmacy/sales/getAll', { token: admin.token })).json || [];
  const sold = new Set(sales.map((s) => s.prescriptionId).filter(Boolean));
  const prescriptions = (await must('GET', '/appointment/report/getAllPrescriptions', { token: admin.token })).json || [];
  meta.prescriptionPool = prescriptions.filter((p) => (p.notes || '').includes(MARK) && !sold.has(p.id)).map((p) => p.id);

  const users = [admin, ...patients, ...doctors];
  const minExp = Math.min(...users.map((u) => u.tokenExp));
  meta = {
    ...meta,
    baseUrl: BASE_URL,
    tokensGeneratedAt: new Date().toISOString(),
    tokensExpireAt: new Date(minExp * 1000).toISOString(),
    counts: { patients: patients.length, doctors: doctors.length },
    businessTzOffsetMinutes: TZ_OFFSET_MIN,
    password: 'see BENCH_PASSWORD (not stored)',
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 1) + '\n');
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n');

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Wrote ${users.length} users to ${path.relative(process.cwd(), USERS_FILE)}`);
  console.log(`Tokens expire at ${meta.tokensExpireAt} (JWT TTL is 5 h — refresh with TOKENS_ONLY=1 before long runs).`);
  console.log(`Medicines: ${(meta.medicines || []).length}, prescription pool (unsold): ${meta.prescriptionPool.length}`);
}

main().catch((err) => {
  console.error(`\nSEED FAILED: ${err.message}`);
  process.exit(1);
});
