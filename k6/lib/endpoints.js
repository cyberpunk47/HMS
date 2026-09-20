// Static endpoint names used as the `endpoint`/`name` tag (never the raw URL, so ids do not
// explode metric cardinality). Every name gets its own Trend (ep_<name>) and success Rate.
export const ENDPOINTS = [
  'users_login', 'users_register',
  'patient_profile_get', 'doctor_profile_get', 'doctor_dropdowns',
  'appointment_schedule', 'appointment_cancel', 'appointment_details', 'appointment_booked_slots',
  'appointments_by_patient', 'appointments_by_doctor', 'appointment_count_by_patient',
  'appointment_count_by_doctor', 'appointment_reasons_by_doctor', 'doctor_patient_dropdown',
  'records_by_patient', 'prescriptions_by_patient', 'all_prescriptions', 'medicines_by_prescription',
  'notifications_patient', 'notifications_doctor',
  'pharmacy_medicine_getall', 'pharmacy_inventory_getall', 'pharmacy_sale_create', 'pharmacy_sale_get',
  'admin_appointments_all', 'access_control',
];
