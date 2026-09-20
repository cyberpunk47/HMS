import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL } from './config.js';
import { ENDPOINTS } from './endpoints.js';

// Per-endpoint metrics (created in init context, as k6 requires).
const trends = {};
const oks = {};
for (const e of ENDPOINTS) {
  trends[e] = new Trend(`ep_${e}`, true);
  oks[e] = new Rate(`ep_${e}_ok`);
}

// HMS reports business-rule rejections as HTTP 500 + {"errorMessage": ...}. They are counted
// separately so they can be told apart from real crashes when a test expects them.
export const businessRejections = new Counter('business_rejections');

/**
 * Tagged request.
 *   endpoint   static endpoint name from endpoints.js
 *   expect     list of statuses that count as success for the check/per-endpoint Rate
 *   needBody   keep the response body (otherwise discarded to save generator memory)
 *   phase      'main' (benchmark traffic) | 'setup' (preparation, excluded from bench metrics)
 *   expectedStatuses  statuses NOT counted in http_req_failed (default 200-399)
 */
export function request(method, path, opts = {}) {
  const { token, body, endpoint, expect = [200], needBody = false, phase = 'main', expectedStatuses } = opts;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const params = {
    headers,
    tags: { endpoint, name: endpoint, bench: phase },
    responseType: needBody ? 'text' : 'none',
  };
  if (expectedStatuses) params.responseCallback = http.expectedStatuses(...expectedStatuses);

  const res = http.request(method, `${BASE_URL}${path}`, body === undefined ? null : JSON.stringify(body), params);
  const ok = expect.includes(res.status);
  if (phase === 'main' && trends[endpoint]) {
    trends[endpoint].add(res.timings.duration);
    oks[endpoint].add(ok);
  }
  check(res, { [`${endpoint} -> ${expect.join('/')}`]: () => ok }, { endpoint, bench: phase });
  return res;
}

export const get = (path, opts) => request('GET', path, opts);
export const post = (path, body, opts) => request('POST', path, { ...opts, body });
export const put = (path, body, opts) => request('PUT', path, { ...opts, body });

export function errorMessage(res) {
  try { return JSON.parse(res.body).errorMessage || ''; } catch (_) { return res.body ? String(res.body).slice(0, 200) : ''; }
}

export function json(res) {
  try { return JSON.parse(res.body); } catch (_) { return null; }
}
