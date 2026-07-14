package com.hms.testtools.seeder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hms.testtools.auth.AuthService;
import com.hms.testtools.auth.TokenManager;
import com.hms.testtools.config.PerformanceProperties;
import com.hms.testtools.dto.Roles;
import com.hms.testtools.dto.SeededUser;
import com.hms.testtools.dto.UserDTO;
import com.hms.testtools.util.ApiTimer;
import com.hms.testtools.util.CsvWriter;

import net.datafaker.Faker;

@Service
public class ParallelSeederService {

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

    public void seedEverythingParallel() {
        System.out.println("Seeding database with parallel threads...");
        long startTime = System.currentTimeMillis();
        System.out.println(">>> Starting Hospital Management System Database Seeder Service (Parallel)...");
        System.out.println(">>> Seeder Start Timestamp: " + java.time.LocalDateTime.now());

        ExecutorService executor = Executors.newFixedThreadPool(perfProps.getParallelThreads());

        String token = "";
        try {
            // Step 1: Register and login as an Admin to get the token for downstream services
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

            token = authService.login(admin.getEmail(), "Password@123");
            System.out.println(">>> Logged in as Admin. Token stored.");
        } catch (Exception e) {
            System.out.println(">>> Login failed: " + e.getMessage() + ". Check if GatewayMS and UserMS are running.");
            executor.shutdown();
            return;
        }

        final String finalToken = token;

        try {
            // Step 2: Seed Doctors in Parallel
            System.out.println(">>> Step 2: Seeding " + perfProps.getDoctors() + " doctors in parallel...");
            List<Long> doctorProfileIds = Collections.synchronizedList(new ArrayList<>());
            List<Future<?>> doctorFutures = new ArrayList<>();
            for (int i = 0; i < perfProps.getDoctors(); i++) {
                final int index = i + 1;
                doctorFutures.add(
                    executor.submit(() -> {
                        TokenManager.setToken(finalToken);
                        try {
                            long start = ApiTimer.start();
                            boolean success = true;
                            try {
                                SeededUser seeded = userSeeder.seedUser(Roles.DOCTOR);
                                profileSeeder.seedDoctorProfile(
                                        seeded.getUser(),
                                        seeded.getProfileId());
                                doctorProfileIds.add(seeded.getProfileId());
                            } catch (Exception e) {
                                success = false;
                                System.out.println(">>> Failed to seed doctor " + index + ": " + e.getMessage());
                            }
                            long rt = ApiTimer.stop(start);
                            CsvWriter.write("REGISTER_DOCTOR", rt, success);
                        } finally {
                            TokenManager.clearToken();
                        }
                    })
                );
            }
            // Wait for doctor threads to finish
            for (Future<?> future : doctorFutures) {
                try {
                    future.get();
                } catch (Exception e) {
                    System.err.println(">>> Error in doctor seeding thread: " + e.getMessage());
                }
            }
            System.out.println(">>> Successfully seeded " + doctorProfileIds.size() + " doctors.");

            // Step 3: Seed Patients in Parallel
            System.out.println(">>> Step 3: Seeding " + perfProps.getPatients() + " patients in parallel...");
            List<Long> patientProfileIds = Collections.synchronizedList(new ArrayList<>());
            List<Future<?>> patientFutures = new ArrayList<>();
            for (int i = 0; i < perfProps.getPatients(); i++) {
                final int index = i + 1;
                patientFutures.add(
                    executor.submit(() -> {
                        TokenManager.setToken(finalToken);
                        try {
                            long start = ApiTimer.start();
                            boolean success = true;
                            try {
                                SeededUser seeded = userSeeder.seedUser(Roles.PATIENT);
                                profileSeeder.seedPatientProfile(
                                        seeded.getUser(),
                                        seeded.getProfileId());
                                patientProfileIds.add(seeded.getProfileId());
                            } catch (Exception e) {
                                success = false;
                                System.out.println(">>> Failed to seed patient " + index + ": " + e.getMessage());
                            }
                            long rt = ApiTimer.stop(start);
                            CsvWriter.write("REGISTER_PATIENT", rt, success);
                        } finally {
                            TokenManager.clearToken();
                        }
                    })
                );
            }
            // Wait for patient threads to finish
            for (Future<?> future : patientFutures) {
                try {
                    future.get();
                } catch (Exception e) {
                    System.err.println(">>> Error in patient seeding thread: " + e.getMessage());
                }
            }
            System.out.println(">>> Successfully seeded " + patientProfileIds.size() + " patients.");

            // Step 4: Seed Medicines in Parallel
            System.out.println(">>> Step 4: Seeding " + perfProps.getMedicines() + " medicines in parallel...");
            List<Long> medicineIds = Collections.synchronizedList(new ArrayList<>());
            List<Future<?>> medicineFutures = new ArrayList<>();
            for (int i = 0; i < perfProps.getMedicines(); i++) {
                final int index = i + 1;
                medicineFutures.add(
                    executor.submit(() -> {
                        TokenManager.setToken(finalToken);
                        try {
                            long start = ApiTimer.start();
                            boolean success = true;
                            try {
                                Long medicineId = medicineSeeder.seedMedicine();
                                medicineIds.add(medicineId);
                            } catch (Exception e) {
                                success = false;
                                System.out.println(">>> Failed to seed medicine " + index + ": " + e.getMessage());
                            }
                            long rt = ApiTimer.stop(start);
                            CsvWriter.write("MEDICINE_CREATED", rt, success);
                        } finally {
                            TokenManager.clearToken();
                        }
                    })
                );
            }
            // Wait for medicine threads to finish
            for (Future<?> future : medicineFutures) {
                try {
                    future.get();
                } catch (Exception e) {
                    System.err.println(">>> Error in medicine seeding thread: " + e.getMessage());
                }
            }
            System.out.println(">>> Successfully seeded " + medicineIds.size() + " medicines.");

            // Step 5: Seed Inventory Batches in Parallel
            if (!medicineIds.isEmpty()) {
                System.out.println(">>> Step 5: Seeding " + perfProps.getInventoryBatches() + " inventory batches in parallel...");
                List<Future<?>> inventoryFutures = new ArrayList<>();
                for (int i = 0; i < perfProps.getInventoryBatches(); i++) {
                    final int index = i + 1;
                    inventoryFutures.add(
                        executor.submit(() -> {
                            TokenManager.setToken(finalToken);
                            try {
                                long start = ApiTimer.start();
                                boolean success = true;
                                try {
                                    Long medId = medicineIds.get(random.nextInt(medicineIds.size()));
                                    inventorySeeder.seedInventory(medId);
                                } catch (Exception e) {
                                    success = false;
                                    System.out.println(">>> Failed to seed inventory batch " + index + ": " + e.getMessage());
                                }
                                long rt = ApiTimer.stop(start);
                                CsvWriter.write("INVENTORY_BATCH_CREATED", rt, success);
                            } finally {
                                TokenManager.clearToken();
                            }
                        })
                    );
                }
                // Wait for inventory threads to finish
                for (Future<?> future : inventoryFutures) {
                    try {
                        future.get();
                    } catch (Exception e) {
                        System.err.println(">>> Error in inventory seeding thread: " + e.getMessage());
                    }
                }
                System.out.println(">>> Successfully seeded inventory batches.");
            } else {
                System.out.println(">>> Skipped inventory seeding because no medicines were seeded.");
            }

            // Step 6: Seed Appointments in Parallel
            if (!patientProfileIds.isEmpty() && !doctorProfileIds.isEmpty()) {
                int apptCount = perfProps.getPatients() * 2;
                System.out.println(">>> Step 6: Seeding " + apptCount + " appointments in parallel...");
                List<Future<?>> apptFutures = new ArrayList<>();
                for (int i = 0; i < apptCount; i++) {
                    final int index = i + 1;
                    apptFutures.add(
                        executor.submit(() -> {
                            TokenManager.setToken(finalToken);
                            try {
                                long start = ApiTimer.start();
                                boolean success = true;
                                try {
                                    Long patId = patientProfileIds.get(random.nextInt(patientProfileIds.size()));
                                    Long docId = doctorProfileIds.get(random.nextInt(doctorProfileIds.size()));
                                    appointmentSeeder.seedAppointment(patId, docId);
                                } catch (Exception e) {
                                    success = false;
                                    System.out.println(">>> Failed to seed appointment " + index + ": " + e.getMessage());
                                }
                                long rt = ApiTimer.stop(start);
                                CsvWriter.write("APPOINTMENT_CREATED", rt, success);
                            } finally {
                                TokenManager.clearToken();
                            }
                        })
                    );
                }
                // Wait for appointment threads to finish
                for (Future<?> future : apptFutures) {
                    try {
                        future.get();
                    } catch (Exception e) {
                        System.err.println(">>> Error in appointment seeding thread: " + e.getMessage());
                    }
                }
                System.out.println(">>> Successfully seeded appointments.");
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
            executor.shutdown();
            TokenManager.clearToken();
        }
    }
}
