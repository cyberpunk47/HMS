package com.hms.appointment.api;

import com.hms.appointment.dto.MedicineDTO;
import com.hms.appointment.dto.PrescriptionDTO;
import com.hms.appointment.dto.PrescriptionDetails;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.service.MedicineService;
import com.hms.appointment.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/appointment/prescription")
@CrossOrigin
@Validated
@RequiredArgsConstructor
public class PrescriptionAPI {
    
    private final PrescriptionService prescriptionService;
    private final MedicineService medicineService;
    
    @PostMapping("/create")
    public ResponseEntity<Long> createPrescription(@RequestBody PrescriptionDTO request) throws HmsException {
        return new ResponseEntity<>(prescriptionService.savePrescription(request), HttpStatus.CREATED);
    }
    
    @PutMapping("/update")
    public ResponseEntity<Void> updatePrescription(@RequestBody PrescriptionDTO request) throws HmsException {
        prescriptionService.updatePrescription(request);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @GetMapping("/get/{id}")
    public ResponseEntity<PrescriptionDTO> getPrescriptionById(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(prescriptionService.getPrescriptionById(id), HttpStatus.OK);
    }
    
    @GetMapping("/get/appointment/{appointmentId}")
    public ResponseEntity<PrescriptionDTO> getPrescriptionByAppointmentId(@PathVariable Long appointmentId) throws HmsException {
        return new ResponseEntity<>(prescriptionService.getPrescriptionByAppointmentId(appointmentId), HttpStatus.OK);
    }
    
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionDetails>> getPrescriptionsByPatientId(@PathVariable Long patientId) throws HmsException {
        return new ResponseEntity<>(prescriptionService.getPrescriptionsByPatientId(patientId), HttpStatus.OK);
    }
    
    @GetMapping("/all")
    public ResponseEntity<List<PrescriptionDetails>> getAllPrescriptions() throws HmsException {
        return new ResponseEntity<>(prescriptionService.getAllPrescriptions(), HttpStatus.OK);
    }
    
    @GetMapping("/medicines/{prescriptionId}")
    public ResponseEntity<List<MedicineDTO>> getMedicinesByPrescriptionId(@PathVariable Long prescriptionId) {
        return new ResponseEntity<>(medicineService.getAllMedicinesByPrescriptionId(prescriptionId), HttpStatus.OK);
    }
}
