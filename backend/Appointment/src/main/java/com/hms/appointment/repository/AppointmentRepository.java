package com.hms.appointment.repository;

import com.hms.appointment.dto.AppointmentDetails;
import com.hms.appointment.dto.MonthlyVisitDTO;
import com.hms.appointment.dto.ReasonCountDTO;
import com.hms.appointment.dto.Status;
import com.hms.appointment.dto.StatusCountDTO;
import com.hms.appointment.entity.Appointment;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends CrudRepository<Appointment, Long>, JpaSpecificationExecutor<Appointment> {
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

    // 1. Get list of distinct patient IDs seen by a doctor
    @Query("SELECT DISTINCT a.patientId FROM Appointment a WHERE a.doctorId = ?1")
    List<Long> findDistinctPatientIdsByDoctorId(Long doctorId);

    // 2. Count distinct patients seen by a doctor monthly (for the Area Chart)
    @Query(value = "SELECT INITCAP(to_char(a.appointment_time, 'FMMonth')) AS month, COUNT(DISTINCT a.patient_id) AS count "
            +
            "FROM appointment a WHERE a.doctor_id = ?1 " +
            "AND EXTRACT(YEAR FROM a.appointment_time) = EXTRACT(YEAR FROM CURRENT_DATE) " +
            "GROUP BY to_char(a.appointment_time, 'FMMonth')", nativeQuery = true)
    List<MonthlyVisitDTO> countCurrentYearPatientsByDoctor(Long doctorId);


    // ---------------------------------------------------------------------
    // Slot-window conflict checks (15-minute rule).
    // An appointment conflicts when another ACTIVE appointment of the same
    // doctor/patient lies strictly inside (time - window, time + window).
    // excludeId lets reschedule ignore the appointment being moved (-1 = none).
    // ---------------------------------------------------------------------
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Appointment a "
            + "WHERE a.doctorId = :doctorId AND a.status IN :statuses "
            + "AND a.appointmentTime > :windowStart AND a.appointmentTime < :windowEnd "
            + "AND a.id <> :excludeId")
    boolean existsDoctorAppointmentInWindow(@Param("doctorId") Long doctorId,
            @Param("statuses") Collection<Status> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd,
            @Param("excludeId") Long excludeId);

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Appointment a "
            + "WHERE a.patientId = :patientId AND a.status IN :statuses "
            + "AND a.appointmentTime > :windowStart AND a.appointmentTime < :windowEnd "
            + "AND a.id <> :excludeId")
    boolean existsPatientAppointmentInWindow(@Param("patientId") Long patientId,
            @Param("statuses") Collection<Status> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd,
            @Param("excludeId") Long excludeId);

    // Transaction-scoped PostgreSQL advisory lock. Serialises concurrent bookings
    // for the same doctor / patient so the window check above cannot race.
    // Released automatically on commit/rollback.
    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(:lockKey)", nativeQuery = true)
    Integer acquireTransactionLock(@Param("lockKey") long lockKey);

    // Active appointment times of a doctor in a time range (used by the slot picker).
    @Query("SELECT a.appointmentTime FROM Appointment a WHERE a.doctorId = :doctorId "
            + "AND a.status IN :statuses AND a.appointmentTime >= :rangeStart AND a.appointmentTime < :rangeEnd "
            + "ORDER BY a.appointmentTime")
    List<LocalDateTime> findActiveAppointmentTimes(@Param("doctorId") Long doctorId,
            @Param("statuses") Collection<Status> statuses,
            @Param("rangeStart") LocalDateTime rangeStart,
            @Param("rangeEnd") LocalDateTime rangeEnd);

    // Access control (called by the Gateway): how many of these patients ever had an appointment
    // with the doctor (any status - the doctor keeps access to their patients' history).
    @Query("SELECT COUNT(DISTINCT a.patientId) FROM Appointment a WHERE a.doctorId = :doctorId AND a.patientId IN :patientIds")
    long countDistinctPatientsOfDoctor(@Param("doctorId") Long doctorId, @Param("patientIds") Collection<Long> patientIds);

    // Admin overview: number of appointments per status.
    @Query("SELECT a.status AS status, COUNT(a) AS count FROM Appointment a GROUP BY a.status")
    List<StatusCountDTO> countByStatus();
}
