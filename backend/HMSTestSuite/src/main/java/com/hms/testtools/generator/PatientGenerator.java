package com.hms.testtools.generator;

import com.hms.testtools.dto.BloodGroup;
import com.hms.testtools.dto.PatientDTO;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.time.ZoneId;
import java.time.LocalDate;

@Component
public class PatientGenerator {

    @Autowired
    private Faker faker;

    public PatientDTO generatePatientProfile() {
        PatientDTO patient = new PatientDTO();
        patient.setDob(LocalDate.ofInstant(faker.date().birthday(1, 90).toInstant(), ZoneId.systemDefault()));
        patient.setProfilePictureId(faker.number().numberBetween(1L, 100L));
        patient.setPhone("9" + faker.number().digits(9));
        patient.setAddress(faker.address().fullAddress());
        patient.setAadharNo(faker.number().digits(12));
        patient.setBloodGroup(faker.options().option(BloodGroup.values()));
        patient.setGender(faker.options().option("MALE", "FEMALE"));
        patient.setAllergies(faker.options().option("None", "Peanuts", "Dust", "Penicillin"));
        patient.setChronicDesease(faker.options().option("None", "Diabetes", "Hypertension", "Asthma"));
        return patient;
    }
}
