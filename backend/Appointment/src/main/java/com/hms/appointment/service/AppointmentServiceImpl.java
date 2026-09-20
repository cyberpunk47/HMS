package com.hms.appointment.service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.*;
import com.hms.appointment.entity.Appointment;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.producer.AppointmentEventProducer;
import com.hms.appointment.repository.ApRecordRepository;
import com.hms.appointment.repository.AppointmentRepository;
import com.hms.appointment.repository.PrescriptionRepository;

import jakarta.persistence.criteria.Predicate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentServiceImpl.class);

    /** Statuses that occupy a doctor's / patient's time slot. CANCELLED and EXPIRED free it. */
    private static final Set<Status> ACTIVE_STATUSES = EnumSet.of(Status.SCHEDULED, Status.COMPLETED);

    /** Advisory-lock namespaces so doctor and patient ids never share a lock key. */
    private static final long DOCTOR_LOCK_NAMESPACE = 7_100_000_000_000L;
    private static final long PATIENT_LOCK_NAMESPACE = 7_200_000_000_000L;

    /** Max ids per batched ProfileMS lookup (keeps the GET query string well under Tomcat's 8 KB limit). */
    private static final int PROFILE_BATCH_SIZE = 200;
    private static final int MAX_ADMIN_PAGE_SIZE = 100;

    private final AppointmentRepository appointmentRepository;
    private final ApRecordRepository apRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final ProfileClient profileClient;
    private final AppointmentEventProducer appointmentEventProducer;
    private final Clock clock;
    private final long slotMinutes;

    public AppointmentServiceImpl(
            AppointmentRepository appointmentRepository,
            ApRecordRepository apRecordRepository,
            PrescriptionRepository prescriptionRepository,
            ProfileClient profileClient,
            AppointmentEventProducer appointmentEventProducer,
            Clock businessClock,
            @Value("${hms.appointment.slot-minutes:15}") long slotMinutes) {

        this.appointmentRepository = appointmentRepository;
        this.apRecordRepository = apRecordRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.profileClient = profileClient;
        this.appointmentEventProducer = appointmentEventProducer;
        this.clock = businessClock;
        this.slotMinutes = slotMinutes;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    @Override
    @Transactional
    public Long scheduleAppointment(AppointmentDTO appointmentDTO) throws HmsException {
        if (appointmentDTO.getDoctorId() == null) {
            throw new HmsException("DOCTOR_NOT_FOUND");
        }
        if (appointmentDTO.getPatientId() == null) {
            throw new HmsException("PATIENT_NOT_FOUND");
        }
        if (appointmentDTO.getAppointmentTime() == null) {
            throw new HmsException("APPOINTMENT_TIME_REQUIRED");
        }

        // 1 feign CAll each for optimization
        DoctorDTO doctor = profileClient.getDoctorById(appointmentDTO.getDoctorId());
        PatientDTO patient = profileClient.getPatientById(appointmentDTO.getPatientId());

        if (doctor == null) {
            throw new HmsException("DOCTOR_NOT_FOUND");
        }

        if (patient == null) {
            throw new HmsException("PATIENT_NOT_FOUND");
        }

        if (appointmentDTO.getAppointmentTime().isBefore(now())) {
            throw new HmsException("APPOINTMENT_TIME_IS_IN_PAST");
        }

        // Serialise concurrent bookings of the same doctor and patient (always doctor first,
        // then patient, so two transactions can never wait on each other in a cycle).
        lockDoctorAndPatient(appointmentDTO.getDoctorId(), appointmentDTO.getPatientId());

        assertSlotFree(appointmentDTO.getDoctorId(), appointmentDTO.getPatientId(),
                appointmentDTO.getAppointmentTime(), -1L,
                "DOCTOR_ALREADY_HAVE_APPOINTMENT_AT_THIS_TIME",
                "PATIENT_ALREADY_HAVE_APPOINTMENT_AT_THIS_TIME");

        appointmentDTO.setId(null);
        appointmentDTO.setStatus(Status.SCHEDULED);
        // Save once
        Appointment appointment = appointmentRepository.save(appointmentDTO.toEntity());

        // Publish Event
        appointmentEventProducer.publishAppointmentCreated(appointment, doctor, patient);

        return appointment.getId();
    }

    private void lockDoctorAndPatient(Long doctorId, Long patientId) {
        appointmentRepository.acquireTransactionLock(DOCTOR_LOCK_NAMESPACE + doctorId);
        appointmentRepository.acquireTransactionLock(PATIENT_LOCK_NAMESPACE + patientId);
    }

    /**
     * 15-minute slot rule: a doctor (or patient) cannot have two active appointments
     * whose start times are less than {@code slotMinutes} apart.
     */
    private void assertSlotFree(Long doctorId, Long patientId, LocalDateTime time, Long excludeId,
            String doctorError, String patientError) throws HmsException {
        LocalDateTime windowStart = time.minusMinutes(slotMinutes);
        LocalDateTime windowEnd = time.plusMinutes(slotMinutes);

        if (appointmentRepository.existsDoctorAppointmentInWindow(doctorId, ACTIVE_STATUSES,
                windowStart, windowEnd, excludeId)) {
            throw new HmsException(doctorError);
        }
        if (appointmentRepository.existsPatientAppointmentInWindow(patientId, ACTIVE_STATUSES,
                windowStart, windowEnd, excludeId)) {
            throw new HmsException(patientError);
        }
    }

    @Override
    @Transactional
    public void cancelAppointment(Long appointmentId) throws HmsException {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND"));

        if (appointment.getStatus().equals(Status.CANCELLED)) {
            throw new HmsException("APPOINTMENT_ALREADY_CANCELLED");
        }
        if (appointment.getAppointmentTime().isBefore(now())) {
            throw new HmsException("CANNOT_CANCEL_APPOINTMENT_TIME_IS_IN_PAST");
        }
        DoctorDTO doctorDTO = profileClient.getDoctorById(appointment.getDoctorId());
        PatientDTO patientDTO = profileClient.getPatientById(appointment.getPatientId());
        appointment.setStatus(Status.CANCELLED);
        appointmentRepository.save(appointment);
        appointmentEventProducer.publishAppointmentCancelled(appointment, doctorDTO, patientDTO);
    }

    @Override
    @Transactional
    public AppointmentDTO completeAppointment(Long appointmentId) throws HmsException {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND"));
        if (appointment.getStatus() != Status.SCHEDULED) {
            throw new HmsException("ONLY_SCHEDULED_CAN_BE_COMPLETED");
        }
        if (appointment.getAppointmentTime().isAfter(now().plusHours(1))) {
            throw new HmsException("CANNOT_COMPLETE_FUTURE_APPOINTMENT");
        }
        DoctorDTO doctorDTO = profileClient.getDoctorById(appointment.getDoctorId());
        PatientDTO patientDTO = profileClient.getPatientById(appointment.getPatientId());
        appointment.setStatus(Status.COMPLETED);
        appointmentRepository.save(appointment);
        appointmentEventProducer.publishAppointmentCompleted(appointment, doctorDTO, patientDTO);
        return appointment.toDTO();
    }

    @Override
    @Transactional
    public AppointmentDTO rescheduleAppointment(Long appointmentId, String newDateTime) throws HmsException {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND"));
        if (appointment.getStatus() != Status.SCHEDULED) {
            throw new HmsException("ONLY_SCHEDULED_CAN_BE_RESCHEDULED");
        }

        LocalDateTime parsedDateTime = LocalDateTime.parse(newDateTime);

        // BUG-07 Fix equivalent: Cannot reschedule to a past date
        if (parsedDateTime.isBefore(now())) {
            throw new HmsException("CANNOT_RESCHEDULE_TO_PAST_DATE");
        }

        // BUG-08 Fix: Overlap Check (same 15-minute slot rule as booking, ignoring this appointment)
        lockDoctorAndPatient(appointment.getDoctorId(), appointment.getPatientId());
        assertSlotFree(appointment.getDoctorId(), appointment.getPatientId(), parsedDateTime,
                appointment.getId(), "DOCTOR_NOT_AVAILABLE_AT_THIS_TIME",
                "PATIENT_ALREADY_HAVE_APPOINTMENT_AT_THIS_TIME");

        // First save the old date time
        LocalDateTime oldDateTime = appointment.getAppointmentTime();
        // Save the the new parsed date in the appointment
        appointment.setAppointmentTime(parsedDateTime);
        // Publish the event
        DoctorDTO doctorDTO = profileClient.getDoctorById(appointment.getDoctorId());
        PatientDTO patientDTO = profileClient.getPatientById(appointment.getPatientId());
        appointmentEventProducer.publishAppointmentRescheduled(appointment, doctorDTO, patientDTO, oldDateTime);

        return appointmentRepository.save(appointment).toDTO();

    }

    @Override
    public AppointmentDTO getAppointmentDetails(Long appointmentId) throws HmsException {
        return appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND")).toDTO();
    }

    @Override
    public AppointmentDetails getAppointmentDetailsWithName(Long appointmentId) throws HmsException {
        AppointmentDTO appointmentDTO = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND")).toDTO();

        String doctorName = "Unknown Doctor";
        try {
            DoctorDTO doctorDTO = profileClient.getDoctorById(appointmentDTO.getDoctorId());
            if (doctorDTO != null)
                doctorName = doctorDTO.getName();
        } catch (Exception e) {
            // Logged or handled gracefully
        }

        String patientName = "Unknown Patient";
        String patientEmail = null;
        String patientPhone = null;
        try {
            PatientDTO patientDTO = profileClient.getPatientById(appointmentDTO.getPatientId());
            if (patientDTO != null) {
                patientName = patientDTO.getName();
                patientEmail = patientDTO.getEmail();
                patientPhone = patientDTO.getPhone();
            }
        } catch (Exception e) {
            // Logged or handled gracefully
        }

        return new AppointmentDetails(appointmentDTO.getId(), appointmentDTO.getPatientId(), patientName,
                patientEmail, patientPhone, appointmentDTO.getDoctorId(), doctorName,
                appointmentDTO.getAppointmentTime(), appointmentDTO.getStatus(), appointmentDTO.getReason(),
                appointmentDTO.getNotes());
    }

    @Override
    public List<AppointmentDetails> getAllAppointmentsByPatientId(Long patientId) throws HmsException {
        List<AppointmentDetails> appointments = appointmentRepository.findAllByPatientId(patientId);
        // One batched ProfileMS call instead of one call per appointment (same response shape).
        Map<Long, String> doctorNames = fetchDoctorNames(
                appointments.stream().map(AppointmentDetails::getDoctorId).toList());
        appointments.forEach(appointment ->
                appointment.setDoctorName(doctorNames.getOrDefault(appointment.getDoctorId(), "Unknown Doctor")));
        return appointments;
    }

    @Override
    public List<AppointmentDetails> getAllAppointmentsByDoctorId(Long doctorId) throws HmsException {
        List<AppointmentDetails> appointments = appointmentRepository.findAllByDoctortId(doctorId);
        Map<Long, PatientDTO> patients = fetchPatients(
                appointments.stream().map(AppointmentDetails::getPatientId).toList());
        appointments.forEach(appointment -> {
            PatientDTO patientDTO = patients.get(appointment.getPatientId());
            appointment.setPatientName(patientDTO != null ? patientDTO.getName() : "Unknown Patient");
            appointment.setPatientEmail(patientDTO != null ? patientDTO.getEmail() : null);
            appointment.setPatientPhone(patientDTO != null ? patientDTO.getPhone() : null);
        });
        return appointments;
    }

    @Override
    public List<MonthlyVisitDTO> getAppointmentCountByPatient(Long patientId) throws HmsException {
        return appointmentRepository.countCurrentYearVisitsByPatient(patientId);
    }

    @Override
    public List<ReasonCountDTO> getReasonCountByPatient(Long patientId) {
        return appointmentRepository.countReasonsByPatientId(patientId);
    }

    @Override
    public List<MonthlyVisitDTO> getAppointmentCountByDoctor(Long doctorId) throws HmsException {
        return appointmentRepository.countCurrentYearVisitsByDoctor(doctorId);
    }

    @Override
    public List<MonthlyVisitDTO> getAppointmentCounts() throws HmsException {
        return appointmentRepository.countCurrentYearVisits();
    }

    @Override
    public List<ReasonCountDTO> getReasonCountByDoctor(Long doctorId) {
        return appointmentRepository.countReasonsByDoctorId(doctorId);
    }

    @Override
    public List<ReasonCountDTO> getReasonCount() {
        return appointmentRepository.countReasons();
    }

    @Override
    public List<AppointmentDetails> getTodaysAppointments() {
        LocalDate today = LocalDate.now(clock);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        List<Appointment> appointments = appointmentRepository.findByAppointmentTimeBetween(startOfDay, endOfDay);

        Map<Long, String> doctorNames = fetchDoctorNames(
                appointments.stream().map(Appointment::getDoctorId).toList());
        Map<Long, PatientDTO> patients = fetchPatients(
                appointments.stream().map(Appointment::getPatientId).toList());

        return appointments.stream().map(appointment -> {
            PatientDTO patientDTO = patients.get(appointment.getPatientId());
            return new AppointmentDetails(appointment.getId(), appointment.getPatientId(),
                    patientDTO != null ? patientDTO.getName() : "Unknown Patient",
                    patientDTO != null ? patientDTO.getEmail() : null,
                    patientDTO != null ? patientDTO.getPhone() : null,
                    appointment.getDoctorId(),
                    doctorNames.getOrDefault(appointment.getDoctorId(), "Unknown Doctor"),
                    appointment.getAppointmentTime(), appointment.getStatus(),
                    appointment.getReason(), appointment.getNotes());
        }).toList();
    }

    // Cron Job
    @Override
    @Scheduled(cron = "0 0 * * * ?", zone = "Asia/Kolkata")
    public void markExpiredAppointments() {

        log.info("Expiry job running at {}", now());

        List<Appointment> expiredAppointments = appointmentRepository.findByStatusAndAppointmentTimeBefore(
                Status.SCHEDULED,
                now());

        log.info("Expiry job found {} scheduled appointments in the past", expiredAppointments.size());

        if (expiredAppointments.isEmpty()) {
            return;
        }

        // STEP 1: Mark all expired
        for (Appointment appt : expiredAppointments) {
            appt.setStatus(Status.EXPIRED);
        }

        // STEP 2: FORCE SAVE TO DATABASE
        appointmentRepository.saveAll(expiredAppointments);

        // STEP 3: Now publish events
        for (Appointment appt : expiredAppointments) {
            try {
                DoctorDTO doctorDTO = null;
                try {
                    doctorDTO = profileClient.getDoctorById(appt.getDoctorId());
                } catch (Exception ignored) {
                }

                PatientDTO patientDTO = null;
                try {
                    patientDTO = profileClient.getPatientById(appt.getPatientId());
                } catch (Exception ignored) {
                }

                appointmentEventProducer.publishAppointmentExpired(
                        appt,
                        doctorDTO,
                        patientDTO);

            } catch (Exception e) {
                log.warn("Failed to publish expiration event for appointment {}: {}", appt.getId(), e.getMessage());
            }
        }
    }

    @Override
    public List<Long> getPatientIdsByDoctorId(Long doctorId) {
        return appointmentRepository.findDistinctPatientIdsByDoctorId(doctorId);
    }

    @Override
    public List<MonthlyVisitDTO> getUniquePatientCountsByDoctor(Long doctorId) {
        return appointmentRepository.countCurrentYearPatientsByDoctor(doctorId);
    }

    @Override
    public List<PatientDTO> getPatientDropDown(Long doctorId) {
        List<Long> patientIds = appointmentRepository.findDistinctPatientIdsByDoctorId(doctorId);
        if(patientIds.isEmpty()) {
            return new ArrayList<>();
        }
        return profileClient.getPatientsDetailsByIds(patientIds);
    }

    // ------------------------------------------------------------------
    // Admin: every appointment in HMS
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public AppointmentPage<AdminAppointmentDetails> getAllAppointments(int page, int size, Status status,
            LocalDateTime from, LocalDateTime to, Long doctorId, Long patientId, boolean ascending) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_ADMIN_PAGE_SIZE);

        Specification<Appointment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("appointmentTime"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.<LocalDateTime>get("appointmentTime"), to));
            }
            if (doctorId != null) {
                predicates.add(cb.equal(root.get("doctorId"), doctorId));
            }
            if (patientId != null) {
                predicates.add(cb.equal(root.get("patientId"), patientId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sort = Sort.by(ascending ? Sort.Direction.ASC : Sort.Direction.DESC, "appointmentTime")
                .and(Sort.by(Sort.Direction.ASC, "id"));
        Page<Appointment> result = appointmentRepository.findAll(spec, PageRequest.of(safePage, safeSize, sort));
        List<Appointment> appointments = result.getContent();

        Map<Long, DoctorDTO> doctors = fetchDoctors(appointments.stream().map(Appointment::getDoctorId).toList());
        Map<Long, PatientDTO> patients = fetchPatients(appointments.stream().map(Appointment::getPatientId).toList());

        List<Long> appointmentIds = appointments.stream().map(Appointment::getId).toList();
        Set<Long> withReport = appointmentIds.isEmpty() ? Set.of()
                : new HashSet<>(apRecordRepository.findAppointmentIdsWithRecord(appointmentIds));
        Map<Long, Long> prescriptionByAppointment = new HashMap<>();
        if (!appointmentIds.isEmpty()) {
            for (Object[] row : prescriptionRepository.findPrescriptionIdsByAppointmentIds(appointmentIds)) {
                prescriptionByAppointment.put((Long) row[0], (Long) row[1]);
            }
        }

        List<AdminAppointmentDetails> content = appointments.stream().map(a -> {
            DoctorDTO d = doctors.get(a.getDoctorId());
            PatientDTO p = patients.get(a.getPatientId());
            return AdminAppointmentDetails.builder()
                    .id(a.getId())
                    .appointmentTime(a.getAppointmentTime())
                    .status(a.getStatus())
                    .reason(a.getReason())
                    .notes(a.getNotes())
                    .patientId(a.getPatientId())
                    .patientName(p != null ? p.getName() : "Unknown Patient")
                    .patientEmail(p != null ? p.getEmail() : null)
                    .patientPhone(p != null ? p.getPhone() : null)
                    .patientGender(p != null ? p.getGender() : null)
                    .patientBloodGroup(p != null ? p.getBloodGroup() : null)
                    .doctorId(a.getDoctorId())
                    .doctorName(d != null ? d.getName() : "Unknown Doctor")
                    .doctorEmail(d != null ? d.getEmail() : null)
                    .doctorPhone(d != null ? d.getPhone() : null)
                    .doctorSpecialization(d != null ? d.getSpecialization() : null)
                    .doctorDepartment(d != null ? d.getDepartment() : null)
                    .reportAvailable(withReport.contains(a.getId()))
                    .prescriptionId(prescriptionByAppointment.get(a.getId()))
                    .build();
        }).toList();

        return new AppointmentPage<>(content, safePage, safeSize, result.getTotalElements(), result.getTotalPages());
    }

    @Override
    public List<StatusCountDTO> getStatusCounts() {
        return appointmentRepository.countByStatus();
    }

    @Override
    public List<LocalDateTime> getBookedTimes(Long doctorId, LocalDate date) {
        // Include the slot window on both sides so bookings just before midnight / just after
        // are reported for the edge slots of the requested day.
        LocalDateTime rangeStart = date.atStartOfDay().minusMinutes(slotMinutes);
        LocalDateTime rangeEnd = date.plusDays(1).atStartOfDay().plusMinutes(slotMinutes);
        return appointmentRepository.findActiveAppointmentTimes(doctorId, ACTIVE_STATUSES, rangeStart, rangeEnd);
    }

    // ------------------------------------------------------------------
    // Batched ProfileMS lookups (resilient: failures fall back to "Unknown ...")
    // ------------------------------------------------------------------

    private Map<Long, String> fetchDoctorNames(Collection<Long> ids) {
        Map<Long, String> names = new HashMap<>();
        for (List<Long> chunk : chunks(ids)) {
            try {
                for (DoctorName doctor : profileClient.getDoctorsById(chunk)) {
                    names.put(doctor.getId(), doctor.getName());
                }
            } catch (Exception e) {
                log.warn("Doctor name lookup failed for {} ids: {}", chunk.size(), e.getMessage());
            }
        }
        return names;
    }

    private Map<Long, DoctorDTO> fetchDoctors(Collection<Long> ids) {
        return fetchById(ids, profileClient::getDoctorsDetailsByIds, DoctorDTO::getId, "Doctor");
    }

    private Map<Long, PatientDTO> fetchPatients(Collection<Long> ids) {
        return fetchById(ids, profileClient::getPatientsDetailsByIds, PatientDTO::getId, "Patient");
    }

    private <T> Map<Long, T> fetchById(Collection<Long> ids, Function<List<Long>, List<T>> loader,
            Function<T, Long> idOf, String label) {
        Map<Long, T> result = new HashMap<>();
        for (List<Long> chunk : chunks(ids)) {
            try {
                for (T item : loader.apply(chunk)) {
                    result.put(idOf.apply(item), item);
                }
            } catch (Exception e) {
                log.warn("{} lookup failed for {} ids: {}", label, chunk.size(), e.getMessage());
            }
        }
        return result;
    }

    private static List<List<Long>> chunks(Collection<Long> ids) {
        List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        List<List<Long>> chunks = new ArrayList<>();
        for (int i = 0; i < distinct.size(); i += PROFILE_BATCH_SIZE) {
            chunks.add(distinct.subList(i, Math.min(i + PROFILE_BATCH_SIZE, distinct.size())));
        }
        return chunks;
    }
}
