package com.hms.appointment.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.ApRecordDTO;
import com.hms.appointment.dto.DoctorName;
import com.hms.appointment.dto.RecordDetails;
import com.hms.appointment.entity.ApRecord;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.repository.ApRecordRepository;
import com.hms.appointment.utility.StringListConverter;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ApRecordServiceImpl implements ApRecordService{

    private final ApRecordRepository apRecordRepository;
    private final PrescriptionService prescriptionService;
    private final ProfileClient profileClient;
    
    @Override
    public Long createApRecord(ApRecordDTO request) throws HmsException {
        Optional<ApRecord> existingRecord = apRecordRepository.findByAppointment_Id(request.getAppointmentId());
        if(existingRecord.isPresent()){
            throw new HmsException("APPOINTMENT_RECORD_ALREADY_EXISTS");
        }
        request.setCreatedAt(LocalDateTime.now());
        Long recordId = apRecordRepository.save(request.toEntity()).getId();
        
        // Save prescription if provided
        if (request.getPrescription() != null) {
            request.getPrescription().setPatientId(request.getPatientId());
            request.getPrescription().setDoctorId(request.getDoctorId());
            request.getPrescription().setAppointmentId(request.getAppointmentId());
            prescriptionService.savePrescription(request.getPrescription());
        }
        
        return recordId;
    }
    
    @Override
    public void updateApRecord(ApRecordDTO request) throws HmsException {
        ApRecord existing = apRecordRepository.findById(request.getId())
                .orElseThrow(()-> new HmsException("APPOINTMENT_RECORD_NOT_FOUND"));
                
        existing.setNotes(request.getNotes());
        existing.setDiagnosis(request.getDiagnosis());
        existing.setFollowUpDate(request.getFollowUpDate());
        existing.setSymptoms(StringListConverter.convertListToString(request.getSymptoms()));
        existing.setTests(StringListConverter.convertListToString(request.getTests()));
        existing.setReferral(request.getReferral());
        apRecordRepository.save(existing);
        
        // Update prescription if provided
        if (request.getPrescription() != null) {
            prescriptionService.updatePrescription(request.getPrescription());
        }
    }
    
    @Override
    public ApRecordDTO getApRecordByAppointmentId(Long appointmentId) throws HmsException {
        return apRecordRepository.findByAppointment_Id(appointmentId)
                .orElseThrow(()-> new HmsException("APPOINTMENT_RECORD_NOT_FOUND"))
                .toDTO();
    }
    
    @Override
    public ApRecordDTO getApRecordDetailsByAppointmentId(Long appointmentId) throws HmsException {
        ApRecordDTO recordDTO = getApRecordByAppointmentId(appointmentId);
        
        try {
            recordDTO.setPrescription(prescriptionService.getPrescriptionByAppointmentId(appointmentId));
        } catch (HmsException e) {
            // Prescription not found, that's okay
            recordDTO.setPrescription(null);
        }
        
        return recordDTO;
    }
    
    @Override
    public ApRecordDTO getApRecordById(Long recordId) throws HmsException {
        return apRecordRepository.findById(recordId)
                .orElseThrow(()-> new HmsException("APPOINTMENT_RECORD_NOT_FOUND"))
                .toDTO();
    }
    
    @Override
    public List<RecordDetails> getRecordsByPatientId(Long patientId) throws HmsException {
        List<ApRecord> records = apRecordRepository.findByPatientId(patientId);
        
        List<Long> doctorIds = records.stream()
                .map(ApRecord::getDoctorId)
                .distinct()
                .toList();
        
        List<DoctorName> doctorNames = profileClient.getDoctorNamesByIds(doctorIds);
        Map<Long, String> doctorNameMap = doctorNames.stream()
                .collect(Collectors.toMap(DoctorName::getId, DoctorName::getName));
        
        List<RecordDetails> result = new ArrayList<>();
        
        for (ApRecord record : records) {
            RecordDetails details = record.toRecordDetails();
            details.setDoctorName(doctorNameMap.get(record.getDoctorId()));
            result.add(details);
        }
        
        return result;
    }
    
    @Override
    public Boolean isRecordExists(Long appointmentId) throws HmsException {
        return apRecordRepository.existsByAppointment_Id(appointmentId);
    }
}
