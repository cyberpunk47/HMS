package com.hms.appointment.service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.ApRecordDTO;
import com.hms.appointment.dto.AppointmentDTO;
import com.hms.appointment.dto.DoctorName;
import com.hms.appointment.dto.RecordDetails;
import com.hms.appointment.entity.ApRecord;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.repository.ApRecordRepository;
import com.hms.appointment.utility.StringListConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
// Spring @Transactional with rollbackFor: HmsException is a checked exception, and the previous
// jakarta @Transactional did NOT roll back on it. A failed "complete appointment" step used to
// leave an orphan report saved while the appointment stayed SCHEDULED.
@Transactional(rollbackFor = Exception.class)
public class ApRecordServiceImpl implements ApRecordService {

    private final ApRecordRepository apRecordRepository;
    private final PrescriptionService prescriptionService;
    private final ProfileClient profileClient;
    private final AppointmentService appointmentService;

    @Override
    public Long createApRecord(ApRecordDTO request) throws HmsException {
        if (request.getAppointmentId() == null) {
            throw new HmsException("APPOINTMENT_NOT_FOUND");
        }
        Optional<ApRecord> existingRecord = apRecordRepository.findByAppointment_Id(request.getAppointmentId());

        if (existingRecord.isPresent()) {
            throw new HmsException("APPOINTMENT_RECORD_ALREADY_EXISTS");
        }

        // 1. Cross-wire: Mark the appointment as completed (validates status/time first).
        AppointmentDTO appointment = appointmentService.completeAppointment(request.getAppointmentId());

        // The report always belongs to the appointment's real patient and doctor.
        request.setPatientId(appointment.getPatientId());
        request.setDoctorId(appointment.getDoctorId());
        request.setId(null);
        request.setCreatedAt(LocalDateTime.now());
        Long id = apRecordRepository.save(request.toEntity()).getId();

        // 2. Save the prescription (Only once!)
        if (request.getPrescription() != null) {
            request.getPrescription().setId(null);
            request.getPrescription().setAppointmentId(request.getAppointmentId());
            request.getPrescription().setPatientId(appointment.getPatientId());
            request.getPrescription().setDoctorId(appointment.getDoctorId());
            prescriptionService.savePrescription(request.getPrescription());
        }

        return id;
    }

    @Override
    public void updateApRecord(ApRecordDTO request) throws HmsException {
        ApRecord existing = apRecordRepository.findById(request.getId())
                .orElseThrow(() -> new HmsException("APPOINTMENT_RECORD_NOT_FOUND"));
        existing.setNotes(request.getNotes());
        existing.setDiagnosis(request.getDiagnosis());
        existing.setFollowUpDate(request.getFollowUpDate());
        existing.setSymptoms(StringListConverter.convertListToString(request.getSymptoms()));
        existing.setTests(StringListConverter.convertListToString(request.getTests()));
        apRecordRepository.save(existing);
    }

    @Override
    public ApRecordDTO getApRecordByAppointmentId(Long appointmentId) throws HmsException {
        return apRecordRepository.findByAppointment_Id(appointmentId)
                .orElseThrow(() -> new HmsException(("APPOINTMENT_RECORD_NOT_FOUND"))).toDTO();
    }

    @Override
    public ApRecordDTO getApRecordById(Long recordId) throws HmsException {
        return apRecordRepository.findById(recordId).orElseThrow(() -> new HmsException("APPOINTMENT_RECORD_NOT_FOUND"))
                .toDTO();
    }

    @Override
    public ApRecordDTO getApRecordDetailsByAppointmentId(Long appointmentId) throws HmsException {
        ApRecordDTO record = apRecordRepository.findByAppointment_Id(appointmentId)
                .orElseThrow(() -> new HmsException(("APPOINTMENT_RECORD_NOT_FOUND"))).toDTO();
        record.setPrescription(prescriptionService.getPrescriptionByAppointmentId(appointmentId));
        return record;
    }

    @Override
    public List<RecordDetails> getRecordsByPatientId(Long patientId) throws HmsException {
        List<ApRecord> records = apRecordRepository.findByPatientId(patientId);
        List<RecordDetails> recordDetails = records.stream()
                .map(ApRecord::toRecordDetails)
                .toList();
        List<Long> doctorsIds = recordDetails.stream()
                .map(RecordDetails::getDoctorId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        // Bug fix: with zero records the empty "ids" list made the Feign call fail (Feign drops the
        // empty query param, ProfileMS rejects the request) and the whole Report tab returned 500.
        Map<Long, String> doctorMap = doctorsIds.isEmpty() ? Map.of()
                : profileClient.getDoctorsById(doctorsIds).stream()
                        .collect(Collectors.toMap(DoctorName::getId, DoctorName::getName, (a, b) -> a));
        recordDetails.forEach(record -> {
            String doctorName = doctorMap.get(record.getDoctorId());
            if (doctorName != null) {
                record.setDoctorName(doctorName);
            } else {
                record.setDoctorName("Unknown doctor");
            }
        });

        return recordDetails;
    }

    @Override
    public Boolean isRecordExists(Long appointmentId) throws HmsException {
        return apRecordRepository.existsByAppointment_Id(appointmentId);
    }
}
