package com.hms.appointment.service;

import com.hms.appointment.dto.PrescriptionDTO;
import com.hms.appointment.dto.PrescriptionDetails;
import com.hms.appointment.exception.HmsException;

import java.util.List;

public interface PrescriptionService {
    Long savePrescription(PrescriptionDTO request) throws HmsException;
    
    void updatePrescription(PrescriptionDTO request) throws HmsException;
    
    PrescriptionDTO getPrescriptionById(Long id) throws HmsException;
    
    PrescriptionDTO getPrescriptionByAppointmentId(Long appointmentId) throws HmsException;
    
    List<PrescriptionDetails> getPrescriptionsByPatientId(Long patientId) throws HmsException;
    
    List<PrescriptionDetails> getAllPrescriptions() throws HmsException;
}
