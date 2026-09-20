#!/usr/bin/env node
// Superseded by k6/seed/seed.js (deterministic, idempotent benchmark seed through the Gateway).
// Kept so existing commands keep working:  BASE_URL=... node prepare-tokens.js
//   -> refreshes JWTs for the already-seeded benchmark users (TOKENS_ONLY mode).
// Run `node seed/seed.js` (without TOKENS_ONLY) first on a fresh database.
process.env.TOKENS_ONLY = process.env.TOKENS_ONLY || '1';
require('./seed/seed.js');
