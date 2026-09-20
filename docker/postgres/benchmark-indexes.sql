-- OPTIONAL secondary indexes for the columns HMS filters on (all idempotent: IF NOT EXISTS).
-- Hibernate (ddl-auto=update) only creates PK / unique indexes, so these lookups are sequential
-- scans today. NOT applied automatically. Apply only as a deliberate, measured change:
-- run the same benchmark step before and after, and report both results.
--
--   docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < docker/postgres/benchmark-indexes.sql
--
-- Tables must already exist (start the services once first so Hibernate creates them).

\connect hms_appointment_db
-- 15-minute slot checks (doctor/patient + time window) and per-doctor / per-patient lists
CREATE INDEX IF NOT EXISTS idx_appointment_doctor_time  ON appointment (doctor_id, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointment_patient_time ON appointment (patient_id, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointment_time         ON appointment (appointment_time);
CREATE INDEX IF NOT EXISTS idx_ap_record_patient        ON ap_record (patient_id);
CREATE INDEX IF NOT EXISTS idx_ap_record_appointment    ON ap_record (appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescription_patient     ON prescription (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_appointment ON prescription (appointment_id);
CREATE INDEX IF NOT EXISTS idx_medicine_prescription    ON medicine (prescription_id);

\connect hms_notification_db
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON notifications (recipient_id, recipient_role, created_at DESC);

\connect hms_pharmacy_db
CREATE INDEX IF NOT EXISTS idx_inventory_medicine       ON medicine_inventory (medicine_id, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_sale_item_sale           ON sale_item (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_prescription        ON sale (prescription_id);
