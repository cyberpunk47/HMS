package com.hms.appointment.service;

import com.hms.appointment.clients.ProfileClient;
import com.hms.appointment.dto.*;
import com.hms.appointment.entity.Appointment;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.producer.AppointmentEventProducer;
import com.hms.appointment.repository.AppointmentRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ApiService apiService;
    private final ProfileClient profileClient;
    private final AppointmentEventProducer appointmentEventProducer;

    public AppointmentServiceImpl(
            AppointmentRepository appointmentRepository,
            ApiService apiService,
            ProfileClient profileClient,
            AppointmentEventProducer appointmentEventProducer) {

        this.appointmentRepository = appointmentRepository;
        this.apiService = apiService;
        this.profileClient = profileClient;
        this.appointmentEventProducer = appointmentEventProducer;
    }

    @Override
    @Transactional
    public Long scheduleAppointment(AppointmentDTO appointmentDTO) throws HmsException {
        // 1 feign CAll each for optimization
        DoctorDTO doctor = profileClient.getDoctorById(appointmentDTO.getDoctorId());
        PatientDTO patient = profileClient.getPatientById(appointmentDTO.getPatientId());

        
        if (doctor == null) {
            throw new HmsException("DOCTOR_NOT_FOUND");
        }

        if (patient == null) {
            throw new HmsException("PATIENT_NOT_FOUND");
        }

        if (appointmentDTO.getAppointmentTime().isBefore(LocalDateTime.now())) {
            throw new HmsException("APPOINTMENT_TIME_IS_IN_PAST");
        }
        if (appointmentRepository.existsByDoctorIdAndAppointmentTime(appointmentDTO.getDoctorId(),
                appointmentDTO.getAppointmentTime())) {
            throw new HmsException("DOCTOR_ALREADY_HAVE_APPOINTMENT_AT_THIS_TIME");
        }
        if (appointmentRepository.existsByPatientIdAndAppointmentTime(appointmentDTO.getPatientId(),
                appointmentDTO.getAppointmentTime())) {
            throw new HmsException("PATIENT_ALREADY_HAVE_APPOINTMENT_AT_THIS_TIME");
        }

        appointmentDTO.setStatus(Status.SCHEDULED);
        // Save once
        Appointment appointment = appointmentRepository.save(appointmentDTO.toEntity());

        // Publish Event 
        appointmentEventProducer.publishAppointmentCreated(appointment, doctor, patient);

        return appointment.getId();    
    }

    @Override
    @Transactional
    public void cancelAppointment(Long appointmentId) throws HmsException {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND"));

        if (appointment.getStatus().equals(Status.CANCELLED)) {
            throw new HmsException("APPOINTMENT_ALREADY_CANCELLED");
        }
        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now())) {
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
        if (appointment.getAppointmentTime().isAfter(LocalDateTime.now().plusHours(1))) {
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
    public AppointmentDTO rescheduleAppointment(Long appointmentId, String newDateTime) throws HmsException {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new HmsException("APPOINTMENT_NOT_FOUND"));
        if (appointment.getStatus() != Status.SCHEDULED) {
            throw new HmsException("ONLY_SCHEDULED_CAN_BE_RESCHEDULED");
        }

        LocalDateTime parsedDateTime = LocalDateTime.parse(newDateTime);

        // BUG-07 Fix equivalent: Cannot reschedule to a past date
        if (parsedDateTime.isBefore(LocalDateTime.now())) {
            throw new HmsException("CANNOT_RESCHEDULE_TO_PAST_DATE");
        }

        // BUG-08 Fix: Overlap Check
        if (appointmentRepository.existsByDoctorIdAndAppointmentTime(appointment.getDoctorId(), parsedDateTime)) {
            throw new HmsException("DOCTOR_NOT_AVAILABLE_AT_THIS_TIME");
        }
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
            if (doctorDTO != null) doctorName = doctorDTO.getName();
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
        return appointmentRepository.findAllByPatientId(patientId).stream()
                .map(appointment -> {
                    String doctorName = "Unknown Doctor";
                    try {
                        DoctorDTO doctorDTO = profileClient.getDoctorById(appointment.getDoctorId());
                        if (doctorDTO != null) doctorName = doctorDTO.getName();
                    } catch (Exception e) {
                        // Resilient fallback
                    }
                    appointment.setDoctorName(doctorName);
                    return appointment;
                }).toList();
    }

    @Override
    public List<AppointmentDetails> getAllAppointmentsByDoctorId(Long doctorId) throws HmsException {
        return appointmentRepository.findAllByDoctortId(doctorId).stream()
                .map(appointment -> {
                    String patientName = "Unknown Patient";
                    String patientEmail = null;
                    String patientPhone = null;
                    try {
                        PatientDTO patientDTO = profileClient.getPatientById(appointment.getPatientId());
                        if (patientDTO != null) {
                            patientName = patientDTO.getName();
                            patientEmail = patientDTO.getEmail();
                            patientPhone = patientDTO.getPhone();
                        }
                    } catch (Exception e) {
                        // Resilient fallback
                    }
                    appointment.setPatientName(patientName);
                    appointment.setPatientEmail(patientEmail);
                    appointment.setPatientPhone(patientPhone);
                    return appointment;
                }).toList();
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
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        return appointmentRepository.findByAppointmentTimeBetween(startOfDay, endOfDay).stream().map(
                appointment -> {
                    String doctorName = "Unknown Doctor";
                    try {
                        DoctorDTO doctorDTO = profileClient.getDoctorById(appointment.getDoctorId());
                        if (doctorDTO != null) doctorName = doctorDTO.getName();
                    } catch (Exception e) {
                        // Resilient fallback
                    }

                    String patientName = "Unknown Patient";
                    String patientEmail = null;
                    String patientPhone = null;
                    try {
                        PatientDTO patientDTO = profileClient.getPatientById(appointment.getPatientId());
                        if (patientDTO != null) {
                            patientName = patientDTO.getName();
                            patientEmail = patientDTO.getEmail();
                            patientPhone = patientDTO.getPhone();
                        }
                    } catch (Exception e) {
                        // Resilient fallback
                    }

                    return new AppointmentDetails(appointment.getId(), appointment.getPatientId(), patientName,
                            patientEmail, patientPhone, appointment.getDoctorId(),
                            doctorName, appointment.getAppointmentTime(), appointment.getStatus(),
                            appointment.getReason(), appointment.getNotes());
                }).toList();
    }

    // Cron Job
    @Override
    @Scheduled(cron = "0 0 * * * ?") // Runs at the top of every hour
    @Transactional
    public void markExpiredAppointments() {
        // Find all SCHEDULED appointments where the time is older than right now
        List<Appointment> expiredAppointments = appointmentRepository
                .findByStatusAndAppointmentTimeBefore(Status.SCHEDULED, LocalDateTime.now());

        for (Appointment appt : expiredAppointments) {
            appt.setStatus(Status.EXPIRED);
            DoctorDTO doctorDTO = profileClient.getDoctorById(appt.getDoctorId());
            PatientDTO patientDTO = profileClient.getPatientById(appt.getPatientId());
            appointmentEventProducer.publishAppointmentExpired(appt, doctorDTO, patientDTO);
        }

        // Save them all in one batch
        if (!expiredAppointments.isEmpty()) {
            appointmentRepository.saveAll(expiredAppointments);
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

}
