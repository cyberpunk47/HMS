-- =====================================================================================
-- HMS benchmark data cleanup — removes ONLY rows created by k6/seed/seed.js and the k6 suite.
-- Identification rules (see seed.js header):
--   emails *@hmsbench.local, appointment notes starting with '[hmsbench]',
--   medicines 'HMSBENCH %', batches 'HMSBENCH-%', sales buyer_name 'HMSBENCH%'.
-- Nothing else is touched. Review the SELECT counts first, then run the DELETE blocks.
--
-- Run each block against its own database, e.g. with Docker Compose:
--   docker compose exec -T postgres psql -U postgres -d hms_appointment_db -v ON_ERROR_STOP=1 -f - < k6/seed/cleanup-bench-data.sql
-- The file uses \connect, so running it once with -d postgres also works:
--   docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < k6/seed/cleanup-bench-data.sql
-- =====================================================================================

\connect hms_appointment_db
BEGIN;
CREATE TEMP TABLE bench_appt AS SELECT id FROM appointment WHERE notes LIKE '[hmsbench]%';
SELECT count(*) AS bench_appointments FROM bench_appt;
DELETE FROM medicine     WHERE prescription_id IN (SELECT id FROM prescription WHERE appointment_id IN (SELECT id FROM bench_appt));
DELETE FROM prescription WHERE appointment_id IN (SELECT id FROM bench_appt);
DELETE FROM ap_record    WHERE appointment_id IN (SELECT id FROM bench_appt);
DELETE FROM appointment  WHERE id IN (SELECT id FROM bench_appt);
COMMIT;

\connect hms_notification_db
BEGIN;
SELECT count(*) AS bench_notifications FROM notifications WHERE recipient_email LIKE '%@hmsbench.local';
DELETE FROM notifications WHERE recipient_email LIKE '%@hmsbench.local';
COMMIT;

\connect hms_pharmacy_db
BEGIN;
SELECT count(*) AS bench_sales FROM sale WHERE buyer_name LIKE 'HMSBENCH%';
DELETE FROM sale_item WHERE sale_id IN (SELECT id FROM sale WHERE buyer_name LIKE 'HMSBENCH%');
DELETE FROM sale      WHERE buyer_name LIKE 'HMSBENCH%';
-- Benchmark medicines/batches are kept by default (they are reusable seed data).
-- Uncomment to remove them too (only if no non-benchmark sale references them):
-- DELETE FROM medicine_inventory WHERE batch_no LIKE 'HMSBENCH-%';
-- DELETE FROM medicine WHERE name LIKE 'HMSBENCH %' AND id NOT IN (SELECT medicine_id FROM sale_item);
COMMIT;

-- Signup-test users (bench.signup.*) are removed; seeded bench users/profiles are kept
-- so tokens and history stay valid. Remove the "AND email LIKE 'bench.signup.%'" filters
-- to delete every benchmark user.
\connect hms_user_db
BEGIN;
SELECT count(*) AS bench_signup_users FROM users WHERE email LIKE 'bench.signup.%@hmsbench.local';
DELETE FROM users WHERE email LIKE 'bench.signup.%@hmsbench.local';
COMMIT;

\connect hms_profile_db
BEGIN;
SELECT count(*) AS bench_signup_patients FROM patient WHERE email LIKE 'bench.signup.%@hmsbench.local';
DELETE FROM patient WHERE email LIKE 'bench.signup.%@hmsbench.local';
COMMIT;
