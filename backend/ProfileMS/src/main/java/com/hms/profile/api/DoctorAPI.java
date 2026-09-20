package com.hms.profile.api;

import com.hms.profile.dto.DoctorDropdown;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.hms.profile.dto.DoctorDTO;
import com.hms.profile.exception.ForbiddenException;
import com.hms.profile.exception.HmsException;
import com.hms.profile.service.DoctorService;

import java.util.List;


@RestController
@RequestMapping("/profile/doctor")
@Validated
public class DoctorAPI {
    @Autowired
    private DoctorService doctorService;

    @PostMapping("/add")
    public ResponseEntity<Long> addDoctor(@RequestBody DoctorDTO doctorDTO) throws HmsException {
        return new ResponseEntity<>(doctorService.addDoctor(doctorDTO), HttpStatus.CREATED);
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<DoctorDTO> getDoctorById(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(doctorService.getDoctorById(id), HttpStatus.OK);
    }

    @GetMapping("/getProfileId/{id}")
    public ResponseEntity<Long> getProfileId(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(doctorService.getDoctorById(id).getProfilePictureId(), HttpStatus.OK);
    }

    @PutMapping("/update")
    public ResponseEntity<DoctorDTO> updateDoctor(@RequestBody DoctorDTO doctorDTO,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Profile-Id", required = false) Long profileId) throws HmsException {
        // Only admins or the owner of the profile may change it (headers set by the Gateway from the JWT).
        if ("DOCTOR".equals(role) && !java.util.Objects.equals(doctorDTO.getId(), profileId)) {
            throw new ForbiddenException("Doctors can only update their own profile.");
        }
        return new ResponseEntity<>(doctorService.updateDoctor(doctorDTO), HttpStatus.OK);
    }

    @GetMapping("/exists/{id}")
    public ResponseEntity<Boolean> doctorExists(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(doctorService.doctorExists(id), HttpStatus.OK);
    }

    @GetMapping("/dropdowns")
    public ResponseEntity<List<DoctorDropdown>> getDoctorDropdowns() throws HmsException{
        return new ResponseEntity<>(doctorService.getDoctorDropdowns(), HttpStatus.OK);
    }
    
    @GetMapping("/getAll")
    public ResponseEntity<List<DoctorDTO>> getAllDoctors() throws HmsException{
    	return new ResponseEntity<>(doctorService.getAllDoctors(), HttpStatus.OK);
    }

    @GetMapping("/getDoctorsById")
    public ResponseEntity<List<DoctorDropdown>> getDoctorsById(@RequestParam List<Long> ids) throws HmsException{
        return new ResponseEntity<>(doctorService.getDoctorsById(ids), HttpStatus.OK);
    }

    // Full doctor details for a batch of ids (mirrors /profile/patient/getPatientsDetailsByIds).
    @GetMapping("/getDoctorsDetailsByIds")
    public ResponseEntity<List<DoctorDTO>> getDoctorsDetailsByIds(@RequestParam List<Long> ids) throws HmsException {
        return new ResponseEntity<>(doctorService.getDoctorsDetailsByIds(ids), HttpStatus.OK);
    }
}
