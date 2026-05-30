package com.hms.appointment.repository;

import com.hms.appointment.dto.AppointmentDetails;
import com.hms.appointment.dto.MonthlyVisitDTO;
import com.hms.appointment.dto.ReasonCountDTO;
import com.hms.appointment.dto.Status;
import com.hms.appointment.entity.Appointment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends CrudRepository<Appointment, Long> {
    @Query("SELECT new com.hms.appointment.dto.AppointmentDetails(a.id, a.patientId, null, null, null, a.doctorId, null , a.appointmentTime, a.status, a.reason, a.notes) FROM Appointment a WHERE a.patientId = ?1")
    List<AppointmentDetails> findAllByPatientId(Long patientId);

    @Query("SELECT new com.hms.appointment.dto.AppointmentDetails(a.id, a.patientId, null, null, null, a.doctorId, null , a.appointmentTime, a.status, a.reason, a.notes) FROM Appointment a WHERE a.doctorId = ?1")
    List<AppointmentDetails> findAllByDoctortId(Long doctorId);

    @Query(value = "SELECT INITCAP(to_char(a.appointment_time, 'FMMonth')) AS month, COUNT(a.id) AS count FROM appointment a WHERE a.patient_id = ?1 AND EXTRACT(YEAR FROM a.appointment_time) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY to_char(a.appointment_time, 'FMMonth')", nativeQuery = true)
    List<MonthlyVisitDTO> countCurrentYearVisitsByPatient(Long patientId);

    @Query(value = "SELECT INITCAP(to_char(a.appointment_time, 'FMMonth')) AS month, COUNT(a.id) AS count FROM appointment a WHERE a.doctor_id = ?1 AND EXTRACT(YEAR FROM a.appointment_time) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY to_char(a.appointment_time, 'FMMonth')", nativeQuery = true)
    List<MonthlyVisitDTO> countCurrentYearVisitsByDoctor(Long doctorId);

    @Query(value = "SELECT INITCAP(to_char(a.appointment_time, 'FMMonth')) AS month, COUNT(a.id) AS count FROM appointment a WHERE EXTRACT(YEAR FROM a.appointment_time) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY to_char(a.appointment_time, 'FMMonth')", nativeQuery = true)
    List<MonthlyVisitDTO> countCurrentYearVisits();

    @Query("SELECT a.reason AS reason, COUNT(a) AS count FROM Appointment a WHERE a.patientId = ?1 GROUP BY a.reason")
    List<ReasonCountDTO> countReasonsByPatientId(Long patientId);

    @Query("SELECT a.reason AS reason, COUNT(a) AS count FROM Appointment a WHERE a.doctorId = ?1 GROUP BY a.reason")
    List<ReasonCountDTO> countReasonsByDoctorId(Long doctorId);

    @Query("SELECT a.reason AS reason, COUNT(a) AS count FROM Appointment a GROUP BY a.reason")
    List<ReasonCountDTO> countReasons();

    List<Appointment> findByAppointmentTimeBetween(LocalDateTime start, LocalDateTime end);

    // For checking if the doctor is double-booked
    boolean existsByDoctorIdAndAppointmentTime(Long doctorId, LocalDateTime appointmentTime);

    // Checking patient is double booking or not
    boolean existsByPatientIdAndAppointmentTime(Long patientId, LocalDateTime appointmentTime);

    // For the Cron Job to find old appointments
    List<Appointment> findByStatusAndAppointmentTimeBefore(Status status, LocalDateTime time);

}
