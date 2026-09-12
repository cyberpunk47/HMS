package com.hms.NotificationMS.event;

import java.time.LocalDateTime;

import com.hms.NotificationMS.entity.Status;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AppointmentEventPayload {

    private Long appointmentId;

    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private String doctorEmail;
    private String doctorPhone;

    private Long patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;

    private LocalDateTime appointmentDateTime;
    private LocalDateTime oldAppointmentDateTime;

    private Status appointmentStatus;

    private String appointmentReason;

}

