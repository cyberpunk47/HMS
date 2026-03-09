package com.hms.appointment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.hms.appointment.dto.AppointmentDetails;
import com.hms.appointment.entity.Appointment;

public interface AppointmentRepository extends CrudRepository<Appointment,Long>{
    @Query("SELECT new com.hms.appointment.dto.AppointmentDetails(a.id, a.patientId, null, null,null, a.doctorId, null , a.appointmentTime, a.status, a.reason, a.notes) FROM Appointment a WHERE a.patientId = ?1")
    List<AppointmentDetails> findAllByPatientId(Long patientId);

    @Query("SELECT new com.hms.appointment.dto.AppointmentDetails(a.id, a.patientId, null, null,null, a.doctorId, null , a.appointmentTime, a.status, a.reason, a.notes) FROM Appointment a WHERE a.doctorId = ?1")
    List<AppointmentDetails> findAllByDoctorId(Long doctorId);

    
}
