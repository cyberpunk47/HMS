package com.hms.appointment.service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.DoctorName;
import com.hms.appointment.dto.PrescriptionDTO;
import com.hms.appointment.dto.PrescriptionDetails;
import com.hms.appointment.entity.Prescription;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.repository.PrescriptionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        
        if (request.getMedicines() != null && !request.getMedicines().isEmpty()) {
            request.getMedicines().forEach(medicine -> medicine.setPrescriptionId(prescriptionId));
            medicineService.saveAllMedicines(request.getMedicines());
        }
        
        return prescriptionId;
    }

    @Override
    public void updatePrescription(PrescriptionDTO request) throws HmsException {
        Optional<Prescription> optional = prescriptionRepository.findById(request.getId());
        if (optional.isEmpty()) {
            throw new HmsException("PRESCRIPTION_NOT_FOUND");
        }
        
        prescriptionRepository.save(request.toEntity());
        
        if (request.getMedicines() != null && !request.getMedicines().isEmpty()) {
            request.getMedicines().forEach(medicine -> medicine.setPrescriptionId(request.getId()));
            medicineService.saveAllMedicines(request.getMedicines());
        }
    }

    @Override
    public PrescriptionDTO getPrescriptionById(Long id) throws HmsException {
        Optional<Prescription> optional = prescriptionRepository.findById(id);
        if (optional.isEmpty()) {
            throw new HmsException("PRESCRIPTION_NOT_FOUND");
        }
        
        PrescriptionDTO prescriptionDTO = optional.get().toDTO();
        prescriptionDTO.setMedicines(medicineService.getAllMedicinesByPrescriptionId(id));
        
        return prescriptionDTO;
    }

    @Override
    public PrescriptionDTO getPrescriptionByAppointmentId(Long appointmentId) throws HmsException {
        Optional<Prescription> optional = prescriptionRepository.findByAppointment_Id(appointmentId);
        if (optional.isEmpty()) {
            throw new HmsException("PRESCRIPTION_NOT_FOUND");
        }
        
        PrescriptionDTO prescriptionDTO = optional.get().toDTO();
        prescriptionDTO.setMedicines(medicineService.getAllMedicinesByPrescriptionId(prescriptionDTO.getId()));
        
        return prescriptionDTO;
    }

    @Override
    public List<PrescriptionDetails> getPrescriptionsByPatientId(Long patientId) throws HmsException {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);
        
        List<Long> doctorIds = prescriptions.stream()
                .map(Prescription::getDoctorId)
                .distinct()
                .toList();
        
        List<DoctorName> doctorNames = profileClient.getDoctorNamesByIds(doctorIds);
        Map<Long, String> doctorNameMap = doctorNames.stream()
                .collect(Collectors.toMap(DoctorName::getId, DoctorName::getName));
        
        List<PrescriptionDetails> result = new ArrayList<>();
        
        for (Prescription prescription : prescriptions) {
            PrescriptionDetails details = prescription.toDetails();
            details.setDoctorName(doctorNameMap.get(prescription.getDoctorId()));
            details.setMedicines(medicineService.getAllMedicinesByPrescriptionId(prescription.getId()));
            result.add(details);
        }
        
        return result;
    }

    @Override
    public List<PrescriptionDetails> getAllPrescriptions() throws HmsException {
        List<Prescription> prescriptions = (List<Prescription>) prescriptionRepository.findAll();
        
        List<Long> doctorIds = prescriptions.stream()
                .map(Prescription::getDoctorId)
                .distinct()
                .toList();
        
        List<DoctorName> doctorNames = profileClient.getDoctorNamesByIds(doctorIds);
        Map<Long, String> doctorNameMap = doctorNames.stream()
                .collect(Collectors.toMap(DoctorName::getId, DoctorName::getName));
        
        List<PrescriptionDetails> result = new ArrayList<>();
        
        for (Prescription prescription : prescriptions) {
            PrescriptionDetails details = prescription.toDetails();
            details.setDoctorName(doctorNameMap.get(prescription.getDoctorId()));
            details.setMedicines(medicineService.getAllMedicinesByPrescriptionId(prescription.getId()));
            result.add(details);
        }
        
        return result;
    }
}
