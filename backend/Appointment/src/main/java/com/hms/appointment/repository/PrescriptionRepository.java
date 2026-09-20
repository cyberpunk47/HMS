package com.hms.appointment.repository;

import com.hms.appointment.entity.Prescription;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends CrudRepository<Prescription, Long> {
    Optional<Prescription> findByAppointment_id(Long appointmentId);

    List<Prescription> findAllByPatientId(Long patientId);

    @Query("SELECT p.id from Prescription p WHERE p.patientId=?1")
    List<Long> findAllPreIdsByPatient(Long patientId);

    // Batch lookup for the admin appointments page: [appointmentId, prescriptionId] pairs.
    @Query("SELECT p.appointment.id, p.id FROM Prescription p WHERE p.appointment.id IN :appointmentIds")
    List<Object[]> findPrescriptionIdsByAppointmentIds(@Param("appointmentIds") Collection<Long> appointmentIds);
}
