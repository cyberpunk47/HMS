package com.hms.profile.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hms.profile.dto.DoctorDTO;
import com.hms.profile.exception.HmsException;
import com.hms.profile.service.DoctorService;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.hms.profile.dto.DoctorDropdown;


@RestController
@CrossOrigin
@Validated
@RequestMapping("/profile/doctor")
public class DoctorAPI {
    @Autowired
    private DoctorService DoctorService;

    @PostMapping("/add")
    public ResponseEntity<Long> addDoctor(@RequestBody DoctorDTO DoctorDTO) throws HmsException {
        return new ResponseEntity<>(DoctorService.addDoctor(DoctorDTO), HttpStatus.CREATED);
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<DoctorDTO> getDoctor(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(DoctorService.getDoctorById(id), HttpStatus.OK);
    }

    @PutMapping("/update")
    public ResponseEntity<DoctorDTO> updateDoctor(@RequestBody DoctorDTO doctorDTO) throws HmsException {
        DoctorService.updateDoctor(doctorDTO);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    @GetMapping("/exists/{id}")
    public ResponseEntity<Boolean> doctorExists(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(DoctorService.doctorExists(id), HttpStatus.OK);
    }

    
    @GetMapping("/dropdowns")
    public ResponseEntity<List<DoctorDropdown>> getDoctorDropdowns() throws HmsException {
        return new ResponseEntity<>(DoctorService.getDoctorDropdowns(), HttpStatus.OK);
    }
    
    @GetMapping("/getDoctorsById")
    public ResponseEntity<List<DoctorDropdown>> getDoctorsById(@RequestParam List<Long> ids) throws HmsException {
        return new ResponseEntity<>(DoctorService.getDoctorsById(ids), HttpStatus.OK);
    }
}
