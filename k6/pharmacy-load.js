// F. PHARMACY WORKFLOW — mirrors the admin Sales page.
// PharmacyMS has NO server-side call to AppointmentMS: the UI loads prescriptions from
// AppointmentMS and posts a sale that references prescriptionId. A prescription can be sold
// only once (SALES_ALREADY_EXISTS), so each seeded, unsold "[hmsbench]" prescription is used by
// exactly one iteration; after the pool is used up, iterations fall back to walk-in sales
// (prescriptionId null — accepted by PharmacyMS, as in the UI).
//
// 1 iteration = 1 sale journey:
//   medicine list -> [prescription medicines]* -> create sale (FIFO stock deduction, row locks)
//   -> read the sale back.            (* only for prescription-based sales)
// Optional (heavy, grows with data): INCLUDE_ALL_PRESCRIPTIONS=true adds GET getAllPrescriptions.
import exec from 'k6/execution';
import { baseOptions, mainScenario } from './lib/config.js';
import { admin, assertTokensValid, meta, patients } from './lib/data.js';
import { businessRejections, errorMessage, get, json, post } from './lib/http.js';
import { makeHandleSummary } from './lib/summary.js';

const INCLUDE_ALL = String(__ENV.INCLUDE_ALL_PRESCRIPTIONS || 'false') === 'true';
const { load, scenario } = mainScenario('journey', 1.0);
export const options = baseOptions({ main: scenario });

const MEDS = meta.medicines || [];
const POOL = meta.prescriptionPool || [];
if (MEDS.length === 0) throw new Error('bench-meta.json has no medicines: run the full seed (not TOKENS_ONLY).');

export function setup() {
  assertTokensValid(load.stress ? 3600 : load.durationSec + 300);
}

export function journey() {
  const n = exec.scenario.iterationInTest;
  const token = (admin || patients[0]).token;

  if (INCLUDE_ALL) get('/appointment/report/getAllPrescriptions', { token, endpoint: 'all_prescriptions' });
  get('/pharmacy/medicine/getAll', { token, endpoint: 'pharmacy_medicine_getall' });

  let prescriptionId = null;
  let items = [];
  if (n < POOL.length) {
    prescriptionId = POOL[n];
    const medsRes = get(`/appointment/report/getMedicinesByPrescriptionId/${prescriptionId}`,
      { token, endpoint: 'medicines_by_prescription', needBody: true });
    const byId = Object.fromEntries(MEDS.map((m) => [m.id, m]));
    items = (json(medsRes) || []).filter((m) => m.medicineId && byId[m.medicineId])
      .map((m) => ({ medicineId: m.medicineId, quantity: 1, unitPrice: byId[m.medicineId].unitPrice }));
  }
  if (items.length === 0) {
    prescriptionId = null;
    const m1 = MEDS[n % MEDS.length];
    const m2 = MEDS[(n + 7) % MEDS.length];
    items = [{ medicineId: m1.id, quantity: 1 + (n % 3), unitPrice: m1.unitPrice }];
    if (m2.id !== m1.id && n % 2 === 0) items.push({ medicineId: m2.id, quantity: 1, unitPrice: m2.unitPrice });
  }
  const totalAmount = items.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0);

  const sale = post('/pharmacy/sales/create', {
    prescriptionId,
    buyerName: prescriptionId ? `HMSBENCH Rx ${prescriptionId}` : `HMSBENCH Walk-in ${n}`,
    buyerContact: `9${String(100000000 + (n % 899999999)).padStart(9, '0')}`,
    totalAmount,
    saleItems: items,
  }, { token, endpoint: 'pharmacy_sale_create', expect: [201], needBody: true });

  if (sale.status === 201) {
    get(`/pharmacy/sales/get/${Number(sale.body)}`, { token, endpoint: 'pharmacy_sale_get' });
  } else {
    const msg = errorMessage(sale);
    if (/stock|already exists/i.test(msg)) businessRejections.add(1);
    if (__ENV.DEBUG) console.warn(`sale #${n}: ${sale.status} ${msg}`);
  }
}

export const handleSummary = makeHandleSummary('pharmacy-load', load, {
  iterationModel: `1 iteration = 1 sale journey (3-4 HTTP requests${INCLUDE_ALL ? ' + getAllPrescriptions' : ''})`,
  custom: () => ({ prescription_pool_size: POOL.length, medicines: MEDS.length }),
});
