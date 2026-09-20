// C. SIGNUP — POST /users/register (BCrypt encode + ProfileMS Feign call + 2 inserts).
// 1 iteration = 1 HTTP request. Every iteration uses a unique deterministic email:
//   bench.signup.<RUN_ID>.<global iteration>@hmsbench.local
// so emails never collide (within or across runs). Rows are removable with
// k6/seed/cleanup-bench-data.sql. NOTE: this test grows hms_user_db/hms_profile_db.
import exec from 'k6/execution';
import { baseOptions, mainScenario, RUN_ID } from './lib/config.js';
import { errorMessage, post } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';

const PASSWORD = __ENV.BENCH_PASSWORD || 'Bench@1234';
const { load, scenario } = mainScenario('run', 0.5);
export const options = baseOptions({ main: scenario });

export function run() {
  const n = exec.scenario.iterationInTest;
  const email = `bench.signup.${RUN_ID}.${n}@hmsbench.local`;
  const res = post('/users/register', { name: `Bench Signup ${n}`, email, password: PASSWORD, role: 'PATIENT' },
    { endpoint: 'users_register', expect: [201], needBody: true });
  if (res.status !== 201 && __ENV.DEBUG) console.warn(`signup ${email}: ${res.status} ${errorMessage(res)}`);
}

export const handleSummary = makeHandleSummary('signup-load', load);
