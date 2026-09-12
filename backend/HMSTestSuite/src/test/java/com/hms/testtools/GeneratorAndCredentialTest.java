package com.hms.testtools;

import com.hms.testtools.dto.DoctorDTO;
import com.hms.testtools.dto.PatientDTO;
import com.hms.testtools.dto.Roles;
import com.hms.testtools.dto.UserCredentialDTO;
import com.hms.testtools.dto.UserDTO;
import com.hms.testtools.generator.DoctorGenerator;
import com.hms.testtools.generator.PatientGenerator;
import com.hms.testtools.generator.UserGenerator;
import com.hms.testtools.util.CredentialWriter;
import net.datafaker.Faker;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class GeneratorAndCredentialTest {

    @Test
    void testUserGeneratorDeterministicIdentity() {
        UserGenerator generator = new UserGenerator();
        ReflectionTestUtils.setField(generator, "faker", new Faker());

        UserDTO patient1 = generator.generateUser(Roles.PATIENT, 1);
        assertEquals("patient001@hms.com", patient1.getEmail());
        assertEquals("Password@123", patient1.getPassword());
        assertEquals(Roles.PATIENT, patient1.getRole());
        assertNotNull(patient1.getName());
        assertFalse(patient1.getName().isBlank());

        UserDTO patient500 = generator.generateUser(Roles.PATIENT, 500);
        assertEquals("patient500@hms.com", patient500.getEmail());

        UserDTO doctor1 = generator.generateUser(Roles.DOCTOR, 1);
        assertEquals("doctor001@hms.com", doctor1.getEmail());
        assertEquals("Password@123", doctor1.getPassword());
        assertEquals(Roles.DOCTOR, doctor1.getRole());
        assertNotNull(doctor1.getName());
        assertFalse(doctor1.getName().isBlank());

        UserDTO doctor500 = generator.generateUser(Roles.DOCTOR, 500);
        assertEquals("doctor500@hms.com", doctor500.getEmail());
    }

    @Test
    void testDoctorGeneratorUniqueFieldsAndFakerProfile() {
        DoctorGenerator generator = new DoctorGenerator();
        ReflectionTestUtils.setField(generator, "faker", new Faker());

        DoctorDTO doc1 = generator.generateDoctorProfile(1);
        DoctorDTO doc2 = generator.generateDoctorProfile(2);

        assertEquals("LIC-000001", doc1.getLicenseNo());
        assertEquals("LIC-000002", doc2.getLicenseNo());
        assertNotEquals(doc1.getPhone(), doc2.getPhone());
        assertNotNull(doc1.getSpecialization());
        assertNotNull(doc1.getDepartment());
        assertNotNull(doc1.getAddress());
        assertNotNull(doc1.getDob());
    }

    @Test
    void testPatientGeneratorUniqueFieldsAndFakerProfile() {
        PatientGenerator generator = new PatientGenerator();
        ReflectionTestUtils.setField(generator, "faker", new Faker());

        PatientDTO pat1 = generator.generatePatientProfile(1);
        PatientDTO pat2 = generator.generatePatientProfile(2);

        assertEquals("100000000001", pat1.getAadharNo());
        assertEquals("100000000002", pat2.getAadharNo());
        assertNotEquals(pat1.getPhone(), pat2.getPhone());
        assertNotNull(pat1.getBloodGroup());
        assertNotNull(pat1.getAddress());
        assertNotNull(pat1.getDob());
    }

    @Test
    void testCredentialWriterOutput() throws Exception {
        File tempFile = File.createTempFile("test-credentials", ".json");
        tempFile.deleteOnExit();

        List<UserCredentialDTO> list = new ArrayList<>();
        list.add(new UserCredentialDTO("doctor002@hms.com", "Password@123", 102L, "DOCTOR"));
        list.add(new UserCredentialDTO("doctor001@hms.com", "Password@123", 101L, "DOCTOR"));
        list.add(new UserCredentialDTO("patient002@hms.com", "Password@123", 202L, "PATIENT"));
        list.add(new UserCredentialDTO("patient001@hms.com", "Password@123", 201L, "PATIENT"));

        CredentialWriter.writeCredentials(tempFile.getAbsolutePath(), list);

        assertTrue(tempFile.exists());
        String content = Files.readString(tempFile.toPath());
        assertTrue(content.contains("patient001@hms.com"));
        assertTrue(content.contains("patient002@hms.com"));
        assertTrue(content.contains("doctor001@hms.com"));
        assertTrue(content.contains("doctor002@hms.com"));
        assertTrue(content.contains("Password@123"));

        // Verify sorted order: PATIENT first, then DOCTOR
        int patientIndex = content.indexOf("patient001@hms.com");
        int doctorIndex = content.indexOf("doctor001@hms.com");
        assertTrue(patientIndex < doctorIndex, "Patients should come before Doctors");
    }
}
