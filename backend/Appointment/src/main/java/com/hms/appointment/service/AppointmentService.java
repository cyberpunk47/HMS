package com.hms.appointment.service;

import com.hms.appointment.dto.AdminAppointmentDetails;
import com.hms.appointment.dto.AppointmentDTO;
import com.hms.appointment.dto.AppointmentPage;
import com.hms.appointment.dto.AppointmentDetails;
import com.hms.appointment.dto.MonthlyVisitDTO;
import com.hms.appointment.dto.PatientDTO;
import com.hms.appointment.dto.PatientDropDownDTO;
import com.hms.appointment.dto.ReasonCountDTO;
import com.hms.appointment.dto.Status;
import com.hms.appointment.dto.StatusCountDTO;
import com.hms.appointment.exception.HmsException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentService {
    Long scheduleAppointment(AppointmentDTO appointmentDTO) throws HmsException;

    void cancelAppointment(Long appointmentId) throws HmsException;

    AppointmentDTO completeAppointment(Long appointmentId) throws HmsException;

    AppointmentDTO rescheduleAppointment(Long appointmentId, String newDateTime) throws HmsException;

    AppointmentDTO getAppointmentDetails(Long appointmentId) throws HmsException;

    AppointmentDetails getAppointmentDetailsWithName(Long appointmentId) throws HmsException;

    List<AppointmentDetails> getAllAppointmentsByPatientId(Long patientId) throws HmsException;

    List<AppointmentDetails> getAllAppointmentsByDoctorId(Long doctorId) throws HmsException;

    List<MonthlyVisitDTO> getAppointmentCountByPatient(Long patientId) throws HmsException;

    List<MonthlyVisitDTO> getAppointmentCountByDoctor(Long doctorId) throws HmsException;

    List<MonthlyVisitDTO> getAppointmentCounts() throws HmsException;

    List<ReasonCountDTO> getReasonCountByPatient(Long patientId);

    List<ReasonCountDTO> getReasonCountByDoctor(Long doctorId);

    List<ReasonCountDTO> getReasonCount();

    List<AppointmentDetails> getTodaysAppointments();

    void markExpiredAppointments();

    // patient related to only one doctor
    List<Long> getPatientIdsByDoctorId(Long doctorId);

    List<MonthlyVisitDTO> getUniquePatientCountsByDoctor(Long doctorId);

    List<PatientDTO> getPatientDropDown(Long doctorId);

    // Admin: paginated, filterable list of every appointment in HMS with full details.
    AppointmentPage<AdminAppointmentDetails> getAllAppointments(int page, int size, Status status,
            LocalDateTime from, LocalDateTime to, Long doctorId, Long patientId, boolean ascending);

    // Admin: number of appointments per status.
    List<StatusCountDTO> getStatusCounts();

    // Slot picker: active appointment times of a doctor around the given date.
    List<LocalDateTime> getBookedTimes(Long doctorId, LocalDate date);

}
