package com.hms.appointment.event;

import java.time.LocalDateTime;

import com.hms.appointment.dto.Status;

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

    private Long patientId;
    private String patientName;

    private LocalDateTime appointmentDateTime;
    private LocalDateTime oldAppointmentDateTime;

    private Status appointmentStatus;

    private String appointmentReason;

}
