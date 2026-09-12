package com.hms.testtools.seeder;

import com.hms.testtools.auth.AuthService;
import com.hms.testtools.auth.TokenManager;
import com.hms.testtools.config.PerformanceProperties;
import com.hms.testtools.dto.Roles;
import com.hms.testtools.dto.UserDTO;
import com.hms.testtools.util.ApiTimer;
import com.hms.testtools.util.CsvWriter;
import com.hms.testtools.dto.SeededUser;
import com.hms.testtools.dto.UserCredentialDTO;
import com.hms.testtools.util.CredentialWriter;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class SeederService {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserSeeder userSeeder;

    @Autowired
    private ProfileSeeder profileSeeder;

    @Autowired
    private MedicineSeeder medicineSeeder;

    @Autowired
    private InventorySeeder inventorySeeder;

    @Autowired
    private AppointmentSeeder appointmentSeeder;

    @Autowired
    private PerformanceProperties perfProps;

    @Autowired
    private Faker faker;

    private final Random random = new Random();

    public void seedEverything() {
        long startTime = System.currentTimeMillis();
        System.out.println(">>> Starting Hospital Management System Database Seeder Service...");
        System.out.println(">>> Seeder Start Timestamp: " + java.time.LocalDateTime.now());

        List<UserCredentialDTO> credentialsList = new ArrayList<>();

        try {
            // Step 1: Register and login as an Admin to get the token for downstream
            // services
            System.out.println(">>> Step 1: Setting up Admin token...");
            UserDTO admin = new UserDTO();
            admin.setName("Admin Seeder");
            admin.setEmail("admin_seeder@hms.com");
            admin.setPassword("Password@123");
            admin.setRole(Roles.ADMIN);

            try {
                authService.register(admin);
                System.out.println(">>> Registered Admin.");
            } catch (Exception e) {
                System.out.println(">>> Admin registration skipped (possibly already exists).");
            }

            try {
                String token = authService.login(admin.getEmail(), "Password@123");
                System.out.println(">>> Logged in as Admin. Token stored.");
            } catch (Exception e) {
                System.out.println(
                        ">>> Login failed: " + e.getMessage() + ". Check if GatewayMS and UserMS are running.");
                return;
            }

            // Step 2: Seed Doctors
            System.out.println(">>> Step 2: Seeding " + perfProps.getDoctors() + " doctors (starting from index " + perfProps.getDoctorStartIndex() + ")...");
            List<Long> doctorProfileIds = new ArrayList<>();
            for (int i = 0; i < perfProps.getDoctors(); i++) {
                int index = perfProps.getDoctorStartIndex() + i;
                long start = ApiTimer.start();
                boolean success = true;

                try {

                    SeededUser seeded = userSeeder.seedUser(Roles.DOCTOR, index);

                    profileSeeder.seedDoctorProfile(
                            seeded.getUser(),
                            seeded.getProfileId(),
                            index);

                    doctorProfileIds.add(seeded.getProfileId());
                    credentialsList.add(new UserCredentialDTO(
                            seeded.getUser().getEmail(),
                            seeded.getUser().getPassword(),
                            seeded.getProfileId(),
                            Roles.DOCTOR.name()));

                } catch (Exception e) {

                    success = false;
                    System.out.println(">>> Failed to seed doctor " + index + ": " + e.getMessage());

                }

                long rt = ApiTimer.stop(start);

                CsvWriter.write(
                        "REGISTER_DOCTOR",
                        rt,
                        success);
            }
            System.out.println(">>> Successfully seeded " + doctorProfileIds.size() + " doctors.");

            // Step 3: Seed Patients
            System.out.println(">>> Step 3: Seeding " + perfProps.getPatients() + " patients (starting from index " + perfProps.getPatientStartIndex() + ")...");
            List<Long> patientProfileIds = new ArrayList<>();
            for (int i = 0; i < perfProps.getPatients(); i++) {
                int index = perfProps.getPatientStartIndex() + i;
                long start = ApiTimer.start();
                boolean success = true;

                try {

                    SeededUser seeded = userSeeder.seedUser(Roles.PATIENT, index);

                    profileSeeder.seedPatientProfile(
                            seeded.getUser(),
                            seeded.getProfileId(),
                            index);

                    patientProfileIds.add(seeded.getProfileId());
                    credentialsList.add(new UserCredentialDTO(
                            seeded.getUser().getEmail(),
                            seeded.getUser().getPassword(),
                            seeded.getProfileId(),
                            Roles.PATIENT.name()));

                } catch (Exception e) {

                    success = false;
                    System.out.println(">>> Failed to seed patient " + index + ": " + e.getMessage());

                }

                long rt = ApiTimer.stop(start);

                CsvWriter.write(
                        "REGISTER_PATIENT",
                        rt,
                        success);
            }
            System.out.println(">>> Successfully seeded " + patientProfileIds.size() + " patients.");

            // Export seeded user credentials for k6 load testing
            CredentialWriter.writeCredentials(perfProps.getCredentialsFile(), credentialsList);

            // Step 4: Seed Medicines
            System.out.println(">>> Step 4: Seeding " + perfProps.getMedicines() + " medicines...");
            List<Long> medicineIds = new ArrayList<>();
            for (int i = 0; i < perfProps.getMedicines(); i++) {
                long start = ApiTimer.start();
                boolean success = true;

                try {
                    Long medicineId = medicineSeeder.seedMedicine();
                    medicineIds.add(medicineId);
                } catch (Exception e) {
                    success = false;
                    System.out.println(">>> Failed to seed medicine " + (i + 1) + ": " + e.getMessage());
                }

                long rt = ApiTimer.stop(start);

                CsvWriter.write(
                        "MEDICINE_CREATED",
                        rt,
                        success);
            }
            System.out.println(">>> Successfully seeded " + medicineIds.size() + " medicines.");

            // Step 5: Seed Inventory Batches
            if (!medicineIds.isEmpty()) {
                System.out.println(">>> Step 5: Seeding " + perfProps.getInventoryBatches() + " inventory batches...");
                int seededInventory = 0;
                for (int i = 0; i < perfProps.getInventoryBatches(); i++) {
                    long start = ApiTimer.start();
                    boolean success = true;
                    try {
                        Long medId = medicineIds.get(random.nextInt(medicineIds.size()));
                        inventorySeeder.seedInventory(medId);
                        seededInventory++;
                    } catch (Exception e) {
                        success = false;
                        System.out.println(">>> Failed to seed inventory batch " + (i + 1) + ": " + e.getMessage());
                    }
                    long rt = ApiTimer.stop(start);

                    CsvWriter.write(
                            "INVENTORY_BATCH_CREATED",
                            rt,
                            success);
                }
                System.out.println(">>> Successfully seeded " + seededInventory + " inventory batches.");
            } else {
                System.out.println(">>> Skipped inventory seeding because no medicines were seeded.");
            }

            // Step 6: Seed Appointments
            if (!patientProfileIds.isEmpty() && !doctorProfileIds.isEmpty()) {
                int apptCount = perfProps.getPatients() * 2;
                System.out.println(">>> Step 6: Seeding " + apptCount + " appointments...");
                int seededAppts = 0;
                for (int i = 0; i < apptCount; i++) {
                    long start = ApiTimer.start();
                    boolean success = true;
                    try {
                        Long patId = patientProfileIds.get(random.nextInt(patientProfileIds.size()));
                        Long docId = doctorProfileIds.get(random.nextInt(doctorProfileIds.size()));
                        appointmentSeeder.seedAppointment(patId, docId);
                        seededAppts++;
                    } catch (Exception e) {
                        success = false;
                        System.out.println(">>> Failed to seed appointment " + (i + 1) + ": " + e.getMessage());
                    }
                    long rt = ApiTimer.stop(start);

                    CsvWriter.write(
                            "APPOINTMENT_CREATED",
                            rt,
                            success);
                }
                System.out.println(">>> Successfully seeded " + seededAppts + " appointments.");
            } else {
                System.out.println(">>> Skipped appointment seeding because doctors or patients list is empty.");
            }

            long endTime = System.currentTimeMillis();
            double durationSec = (endTime - startTime) / 1000.0;
            System.out.println(">>> Database Seeding Completed Successfully!");
            System.out.println(">>> Seeder End Timestamp: " + java.time.LocalDateTime.now());
            System.out.println(">>> Total Seeding Time: " + durationSec + " seconds");

        } catch (Exception e) {
            System.err.println(">>> Seeding encountered a fatal error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Clean up admin token
            TokenManager.clearToken();
        }
    }
}
