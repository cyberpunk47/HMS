package com.hms.appointment.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import com.hms.appointment.entity.ApRecord;

public interface ApRecordRepository extends CrudRepository<ApRecord, Long> {
    Optional<ApRecord> findByAppointment_Id(Long appointmentId);
    
    List<ApRecord> findByPatientId(Long patientId);
    
    Boolean existsByAppointment_Id(Long appointmentId);

    // Batch lookup for the admin appointments page: which appointments have a report.
    @Query("SELECT r.appointment.id FROM ApRecord r WHERE r.appointment.id IN :appointmentIds")
    List<Long> findAppointmentIdsWithRecord(@Param("appointmentIds") Collection<Long> appointmentIds);
}
