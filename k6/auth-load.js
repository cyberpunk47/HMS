// B. AUTHENTICATION — POST /users/login only (BCrypt verify + 1 user lookup + JWT sign in UserMS).
// 1 iteration = 1 HTTP request. Users are the seeded benchmark users (round-robin, deterministic).
//
//   k6 run -e BASE_URL=... -e PHASE=smoke auth-load.js
//   k6 run -e BASE_URL=... -e BENCH_PASSWORD='Bench@1234' -e PHASE=step5k auth-load.js
//
// To separate latency components (DB vs Hikari wait vs BCrypt vs JWT) correlate this test's
// latency with UserMS CPU and /actuator/metrics/hikaricp.connections.pending (see README);
// BCrypt cost is CPU-bound, DB/Hikari waits are not.
import exec from 'k6/execution';
import { baseOptions, mainScenario } from './lib/config.js';
import { doctors, patients } from './lib/data.js';
import { post } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';

const PASSWORD = __ENV.BENCH_PASSWORD || 'Bench@1234';
const { load, scenario } = mainScenario('run', 0.3);
export const options = baseOptions({ main: scenario });

const USERS = [...patients, ...doctors].map((u) => u.email);

export function run() {
  const email = USERS[exec.scenario.iterationInTest % USERS.length];
  const res = post('/users/login', { email, password: PASSWORD }, { endpoint: 'users_login', expect: [200], needBody: true });
  if (res.status === 200 && !(res.body && res.body.startsWith('eyJ'))) {
    console.error(`login ${email} returned 200 without a JWT`);
  }
}

export const handleSummary = makeHandleSummary('auth-load', load);
