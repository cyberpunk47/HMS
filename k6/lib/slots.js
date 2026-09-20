// Collision-free appointment slot allocation for booking tests.
//
// HMS rule: a doctor (and a patient) cannot have two active appointments whose start times are
// < 15 minutes apart. Booking n (global iteration number) gets:
//   doctor  = n % D,  slot = floor(n / D),  patient = n % P   (requires P >= D)
//   time    = base + slot * 15 min
// Inside one slot every doctor and every patient appears at most once, and consecutive slots
// are exactly 15 minutes apart (allowed), so the load test itself never causes conflicts.
//
// The base day is far in the future and derived from RUN_ID so different runs use different
// days. Pin it with SLOT_DAY_OFFSET (days from today) if you want reproducible dates.
import { RUN_ID } from './config.js';

export const SLOT_MINUTES = 15;
const TZ_OFFSET_MIN = Number(__ENV.BENCH_TZ_OFFSET_MINUTES || 330); // AppointmentMS business zone (IST)

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function slotDayOffset(salt) {
  if (__ENV.SLOT_DAY_OFFSET) return Number(__ENV.SLOT_DAY_OFFSET);
  return 60 + (hash(`${RUN_ID}:${salt || ''}`) % 3000); // ~2 months .. ~8 years ahead
}

const pad = (n) => String(n).padStart(2, '0');

// LocalDateTime string (no zone) = business wall-clock time, as the frontend sends it.
export function formatLocal(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

// Midnight of (business today + offsetDays), as epoch-ms whose UTC fields are wall-clock fields.
export function baseMidnight(offsetDays) {
  const nowWall = Date.now() + TZ_OFFSET_MIN * 60000;
  const d = new Date(nowWall);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays);
}

export function allocate(n, patientCount, doctorCount, baseMs) {
  const slot = Math.floor(n / doctorCount);
  return {
    doctorIndex: n % doctorCount,
    patientIndex: n % patientCount,
    time: formatLocal(baseMs + slot * SLOT_MINUTES * 60000),
    date: formatLocal(baseMs + slot * SLOT_MINUTES * 60000).slice(0, 10),
  };
}

export const REASONS = ['General Consultation', 'Routine Check-up', 'Follow-up Visit', 'Blood Test', 'Specialist Consultation'];
