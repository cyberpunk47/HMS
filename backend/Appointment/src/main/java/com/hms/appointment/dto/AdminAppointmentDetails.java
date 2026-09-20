package com.hms.appointment.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Full appointment view for the admin "Appointments" page.
 * Patient/doctor fields are resolved from ProfileMS in batch; record/prescription
 * flags come from this service's own tables.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAppointmentDetails {
    private Long id;
    private LocalDateTime appointmentTime;
    private Status status;
    private String reason;
    private String notes;

    private Long patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private String patientGender;
    private BloodGroup patientBloodGroup;

    private Long doctorId;
    private String doctorName;
    private String doctorEmail;
    private String doctorPhone;
    private String doctorSpecialization;
    private String doctorDepartment;

    private boolean reportAvailable;
    private Long prescriptionId;
}
