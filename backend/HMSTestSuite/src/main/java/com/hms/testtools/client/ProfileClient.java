package com.hms.testtools.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import com.hms.testtools.dto.DoctorDTO;
import com.hms.testtools.dto.PatientDTO;
import java.util.List;

@FeignClient(
    name = "profile-client",
    url = "${gateway.url}"
)
public interface ProfileClient {

    // Doctors
    @PostMapping("/profile/doctor/add")
    Long addDoctor(@RequestBody DoctorDTO doctorDTO);

    @GetMapping("/profile/doctor/get/{id}")
    DoctorDTO getDoctorById(@PathVariable("id") Long id);

    @PutMapping("/profile/doctor/update")
    DoctorDTO updateDoctor(@RequestBody DoctorDTO doctorDTO);

    @GetMapping("/profile/doctor/exists/{id}")
    Boolean doctorExists(@PathVariable("id") Long id);

    @GetMapping("/profile/doctor/getAll")
    List<DoctorDTO> getAllDoctors();

    // Patients
    @PostMapping("/profile/patient/add")
    Long addPatient(@RequestBody PatientDTO patientDTO);

    @GetMapping("/profile/patient/get/{id}")
    PatientDTO getPatientById(@PathVariable("id") Long id);

    @PutMapping("/profile/patient/update")
    PatientDTO updatePatient(@RequestBody PatientDTO patientDTO);

    @GetMapping("/profile/patient/exists/{id}")
    Boolean patientExists(@PathVariable("id") Long id);

    @GetMapping("/profile/patient/getAll")
    List<PatientDTO> getAllPatients();
}
