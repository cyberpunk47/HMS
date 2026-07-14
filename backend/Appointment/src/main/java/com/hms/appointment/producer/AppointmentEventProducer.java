package com.hms.appointment.producer;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.hms.appointment.dto.DoctorDTO;
import com.hms.appointment.dto.PatientDTO;
import com.hms.appointment.entity.Appointment;
import com.hms.appointment.event.AppointmentEventPayload;
import com.hms.appointment.event.EventType;
import com.hms.appointment.event.HmsEvent;

@Service
public class AppointmentEventProducer {

    @Value("${hms.kafka.topic.appointment}")
    private String topic;

    private final KafkaTemplate<String, HmsEvent<AppointmentEventPayload>> kafkaTemplate;

    public AppointmentEventProducer(
            KafkaTemplate<String, HmsEvent<AppointmentEventPayload>> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishAppointmentCreated(
            Appointment appointment,
            DoctorDTO doctor,
            PatientDTO patient) {

        AppointmentEventPayload payload = buildPayload(
                appointment,
                doctor,
                patient);

        HmsEvent<AppointmentEventPayload> event = createEvent(EventType.APPOINTMENT_CREATED, payload);

        kafkaTemplate.send(topic, event);
    }

    public void publishAppointmentRescheduled(
            Appointment appointment,
            DoctorDTO doctor,
            PatientDTO patient,
            LocalDateTime oldDateTime
        ) {

        AppointmentEventPayload payload = buildPayload(
                appointment,
                doctor,
                patient);
        
        payload.setOldAppointmentDateTime(oldDateTime);
        HmsEvent<AppointmentEventPayload> event = createEvent(EventType.APPOINTMENT_RESCHEDULED, payload);

        kafkaTemplate.send(topic, event);
    }

    public void publishAppointmentCompleted(
            Appointment appointment,
            DoctorDTO doctor,
            PatientDTO patient) {

        AppointmentEventPayload payload = buildPayload(
                appointment,
                doctor,
                patient);

        HmsEvent<AppointmentEventPayload> event = createEvent(EventType.APPOINTMENT_COMPLETED, payload);

        kafkaTemplate.send(topic, event);
    }

    public void publishAppointmentCancelled(
            Appointment appointment,
            DoctorDTO doctor,
            PatientDTO patient) {

        AppointmentEventPayload payload = buildPayload(
                appointment,
                doctor,
                patient);

        HmsEvent<AppointmentEventPayload> event = createEvent(EventType.APPOINTMENT_CANCELLED, payload);

        kafkaTemplate.send(topic, event);
    }
    public void publishAppointmentExpired(Appointment appointment,
        DoctorDTO doctor,
        PatientDTO patient
    ) {
        AppointmentEventPayload payload = buildPayload(
                appointment,
                doctor,
                patient);

        HmsEvent<AppointmentEventPayload> event = createEvent(EventType.APPOINTMENT_EXPIRED, payload);

        kafkaTemplate.send(topic, event);
    }

    private AppointmentEventPayload buildPayload(
            Appointment appointment,
            DoctorDTO doctor,
            PatientDTO patient) {

        AppointmentEventPayload payload = new AppointmentEventPayload();

        payload.setAppointmentId(appointment.getId());

        payload.setDoctorId(doctor.getId());
        payload.setDoctorName(doctor.getName());
        payload.setDoctorSpecialization(doctor.getSpecialization());

        payload.setPatientId(patient.getId());
        payload.setPatientName(patient.getName());

        payload.setAppointmentDateTime(appointment.getAppointmentTime());

        payload.setAppointmentStatus(appointment.getStatus());

        payload.setAppointmentReason(appointment.getReason());

        return payload;
    }

    private HmsEvent<AppointmentEventPayload> createEvent(
            EventType eventType,
            AppointmentEventPayload payload) {

        HmsEvent<AppointmentEventPayload> event = new HmsEvent<>();

        event.setEventId(UUID.randomUUID().toString());
        event.setEventType(eventType);
        event.setTimestamp(Instant.now());
        event.setPayload(payload);

        return event;
    }
}