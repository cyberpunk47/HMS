package com.hms.testtools.seeder;

import com.hms.testtools.client.ProfileClient;
import com.hms.testtools.dto.DoctorDTO;
import com.hms.testtools.dto.PatientDTO;
import com.hms.testtools.dto.UserDTO;
import com.hms.testtools.generator.DoctorGenerator;
import com.hms.testtools.generator.PatientGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ProfileSeeder {

    @Autowired
    private ProfileClient profileClient;

    @Autowired
    private DoctorGenerator doctorGenerator;

    @Autowired
    private PatientGenerator patientGenerator;

    public void seedDoctorProfile(UserDTO user, Long profileId) {
        DoctorDTO doctorDTO = doctorGenerator.generateDoctorProfile();
        doctorDTO.setId(profileId);
        doctorDTO.setName(user.getName());
        doctorDTO.setEmail(user.getEmail());
        profileClient.updateDoctor(doctorDTO);
    }

    public void seedPatientProfile(UserDTO user, Long profileId) {
        PatientDTO patientDTO = patientGenerator.generatePatientProfile();
        patientDTO.setId(profileId);
        patientDTO.setName(user.getName());
        patientDTO.setEmail(user.getEmail());
        profileClient.updatePatient(patientDTO);
    }
}
