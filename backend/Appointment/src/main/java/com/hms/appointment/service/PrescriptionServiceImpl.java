package com.hms.appointment.service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.DoctorName;
import com.hms.appointment.dto.MedicineDTO;
import com.hms.appointment.dto.PatientName;
import com.hms.appointment.dto.PrescriptionDTO;
import com.hms.appointment.dto.PrescriptionDetails;
import com.hms.appointment.entity.Prescription;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.repository.PrescriptionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;

    private final MedicineService medicineService;

    private final ProfileClient profileClient;

    @Override
    public Long savePrescription(PrescriptionDTO request) throws HmsException {
        request.setPrescriptionDate(LocalDate.now());
        Long prescriptionId = prescriptionRepository.save(request.toEntity()).getId();
        if (request.getMedicines() != null) {
            request.getMedicines().forEach(medicine -> medicine.setPrescriptionId(prescriptionId));
            medicineService.saveAllMedicines(request.getMedicines());
        }
        return prescriptionId;
    }

    @Override
    public void updatePrescription(PrescriptionDTO request) throws HmsException {
        prescriptionRepository.findById(request.getId()).orElseThrow(() -> new HmsException("PRESCRIPTION_NOT_FOUND"));
        prescriptionRepository.save(request.toEntity());
        if (request.getMedicines() != null) {
            request.getMedicines().forEach(medicine -> medicine.setPrescriptionId(request.getId()));
            medicineService.saveAllMedicines(request.getMedicines());
        }
    }

    @Override
    public PrescriptionDTO getPrescriptionByAppointmentId(Long appointmentId) throws HmsException {
        PrescriptionDTO prescriptionDTO = prescriptionRepository.findByAppointment_id(appointmentId).orElseThrow(() -> new HmsException("PRESCRIPTION_NOT_FOUND")).toDTO();
        prescriptionDTO.setMedicines(medicineService.getAllMedicinesByPrescriptionId(prescriptionDTO.getId()));
        return prescriptionDTO;
    }

    @Override
    public PrescriptionDTO getPrescriptionById(Long prescriptionId) throws HmsException {
        PrescriptionDTO dto = prescriptionRepository.findById(prescriptionId).orElseThrow(() -> new HmsException("PRESCRIPTION_NOT_FOUND")).toDTO();
        dto.setMedicines(medicineService.getAllMedicinesByPrescriptionId(dto.getId()));
        return dto;
    }

    @Override
    public List<PrescriptionDetails> getPrescriptionsByPatientId(Long patientId) throws HmsException {
        List<Prescription> prescriptions = prescriptionRepository.findAllByPatientId(patientId);
        List<PrescriptionDetails> prescriptionDetails = prescriptions.stream()
                .map(Prescription::toDetails)
                .toList();
        attachMedicines(prescriptionDetails);
        List<Long> doctorsIds = prescriptionDetails.stream()
                .map(PrescriptionDetails::getDoctorId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        // Bug fix: skip the ProfileMS call when there is nothing to resolve (an empty "ids" list
        // made the Feign call fail and the Prescriptions tab returned 500 for new patients).
        Map<Long, String> doctorMap = doctorsIds.isEmpty() ? Map.of()
                : profileClient.getDoctorsById(doctorsIds).stream()
                        .collect(Collectors.toMap(DoctorName::getId, DoctorName::getName, (a, b) -> a));
        prescriptionDetails.forEach(details -> {
            String doctorName = doctorMap.get(details.getDoctorId());
            if (doctorName != null) {
                details.setDoctorName(doctorName);
            } else {
                details.setDoctorName("Unknown Doctor");
            }
        });

        return prescriptionDetails;
    }

    // One query for all medicines instead of one query per prescription (same response shape).
    private void attachMedicines(List<PrescriptionDetails> prescriptionDetails) {
        if (prescriptionDetails.isEmpty()) {
            return;
        }
        List<Long> ids = prescriptionDetails.stream().map(PrescriptionDetails::getId).toList();
        Map<Long, List<MedicineDTO>> byPrescription = medicineService.getMedicinesByPrescriptionIds(ids).stream()
                .collect(Collectors.groupingBy(MedicineDTO::getPrescriptionId));
        prescriptionDetails.forEach(details ->
                details.setMedicines(byPrescription.getOrDefault(details.getId(), List.of())));
    }

	@Override
	public List<PrescriptionDetails> getPrescriptions() throws HmsException {
		List<Prescription> prescriptions = (List<Prescription>) prescriptionRepository.findAll();
		List<PrescriptionDetails> prescriptionDetails = prescriptions.stream()
				.map(Prescription::toDetails)
				.toList();
		List<Long> doctorIds = prescriptionDetails.stream()
				.map(PrescriptionDetails::getDoctorId)
				.distinct()
				.toList();
		List<Long> patientIds = prescriptionDetails.stream()
				.map(PrescriptionDetails::getPatientId)
				.distinct()
				.toList();
		List<DoctorName> doctorNames = doctorIds.isEmpty() ? List.of() : profileClient.getDoctorsById(doctorIds);
		List<PatientName> patientNames = patientIds.isEmpty() ? List.of() : profileClient.getPatientsById(patientIds);
		
		Map<Long, String> doctorMap = doctorNames.stream()
				.collect(Collectors.toMap(DoctorName::getId, DoctorName::getName, (a, b) -> a));
				
		Map<Long, String> patientMap = patientNames.stream()
				.collect(Collectors.toMap(PatientName::getId, PatientName::getName, (a, b) -> a));
		
		prescriptionDetails.forEach(details -> {
            String doctorName = doctorMap.get(details.getDoctorId());
            String patientName = patientMap.get(details.getPatientId());
            if (doctorName != null) {
            	details.setDoctorName(doctorName);
            } else {
            	details.setDoctorName("Unknown Doctor");
            }
            
            if (patientName != null) {
            	details.setPatientName(patientName);
            }else {
            	details.setPatientName("Unknown Patient");
            }
        }); 
		
		return prescriptionDetails;
	}

    @Override
    public List<PrescriptionDetails> getAllPrescriptions() throws HmsException {
        return getPrescriptions();
    }

    @Override
    public List<MedicineDTO> getMedicineByPatientId(Long patientId) throws HmsException {
         List<Long> pids = prescriptionRepository.findAllPreIdsByPatient(patientId);
         return medicineService.getMedicinesByPrescriptionIds(pids);
    }
}
