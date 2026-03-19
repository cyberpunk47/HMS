package com.hms.appointment.api;

import com.hms.appointment.dto.ApRecordDTO;
import com.hms.appointment.dto.RecordDetails;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.service.ApRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/appointment/record")
@CrossOrigin
@Validated
@RequiredArgsConstructor
public class ApRecordAPI {
    
    private final ApRecordService apRecordService;
    
    @PostMapping("/create")
    public ResponseEntity<Long> createApRecord(@RequestBody ApRecordDTO request) throws HmsException {
        return new ResponseEntity<>(apRecordService.createApRecord(request), HttpStatus.CREATED);
    }
    
    @PutMapping("/update")
    public ResponseEntity<Void> updateApRecord(@RequestBody ApRecordDTO request) throws HmsException {
        apRecordService.updateApRecord(request);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @GetMapping("/get/{id}")
    public ResponseEntity<ApRecordDTO> getApRecordById(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(apRecordService.getApRecordById(id), HttpStatus.OK);
    }
    
    @GetMapping("/get/appointment/{appointmentId}")
    public ResponseEntity<ApRecordDTO> getApRecordByAppointmentId(@PathVariable Long appointmentId) throws HmsException {
        return new ResponseEntity<>(apRecordService.getApRecordByAppointmentId(appointmentId), HttpStatus.OK);
    }
    
    @GetMapping("/get/details/{appointmentId}")
    public ResponseEntity<ApRecordDTO> getApRecordDetailsByAppointmentId(@PathVariable Long appointmentId) throws HmsException {
        return new ResponseEntity<>(apRecordService.getApRecordDetailsByAppointmentId(appointmentId), HttpStatus.OK);
    }
    
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<RecordDetails>> getRecordsByPatientId(@PathVariable Long patientId) throws HmsException {
        return new ResponseEntity<>(apRecordService.getRecordsByPatientId(patientId), HttpStatus.OK);
    }
    
    @GetMapping("/exists/{appointmentId}")
    public ResponseEntity<Boolean> isRecordExists(@PathVariable Long appointmentId) throws HmsException {
        return new ResponseEntity<>(apRecordService.isRecordExists(appointmentId), HttpStatus.OK);
    }
}
