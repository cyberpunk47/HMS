// benchmark.js used to mix GET/POST/PUT/LOGIN/SIGNUP into one scenario, which made the numbers
// impossible to attribute. It is now split into dedicated scripts (see README.md):
//   api-load.js  auth-load.js  signup-load.js  appointment-load.js  slot-conflict.js
//   realistic-patient.js  realistic-doctor.js  pharmacy-load.js
// This file keeps the old command working and runs the API throughput test:
//   k6 run -e BASE_URL=... -e PHASE=validation benchmark.js   (== api-load.js, PHASE=step1k)
export { options, setup, run, handleSummary } from './api-load.js';
export default function () {}
