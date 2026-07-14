package com.hms.testtools.generator;

import com.hms.testtools.dto.DoctorDTO;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.time.ZoneId;
import java.time.LocalDate;

@Component
public class DoctorGenerator {

    @Autowired
    private Faker faker;

    public DoctorDTO generateDoctorProfile() {
        DoctorDTO doctor = new DoctorDTO();
        doctor.setDob(LocalDate.ofInstant(faker.date().birthday(25, 60).toInstant(), ZoneId.systemDefault()));
        doctor.setProfilePictureId(faker.number().numberBetween(1L, 100L));
        doctor.setPhone("9" + faker.number().digits(9));
        doctor.setAddress(faker.address().fullAddress());
        doctor.setLicenseNo("LIC-" + faker.random().hex(8).toUpperCase());
        doctor.setGender(faker.options().option("MALE", "FEMALE"));
        doctor.setSpecialization(faker.options().option("Cardiologist", "Neurologist", "Dermatologist", "Pediatrician"));
        doctor.setDepartment(faker.options().option("Cardiology", "Neurology", "Dermatology", "Pediatrics"));
        doctor.setTotalExp(faker.number().numberBetween(2, 35));
        return doctor;
    }
}
