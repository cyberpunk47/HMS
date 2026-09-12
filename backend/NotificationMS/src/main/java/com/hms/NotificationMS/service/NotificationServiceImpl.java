package com.hms.NotificationMS.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.hms.NotificationMS.entity.Notification;
import com.hms.NotificationMS.entity.NotificationStatus;
import com.hms.NotificationMS.event.AppointmentEventPayload;
import com.hms.NotificationMS.event.HmsEvent;
import com.hms.NotificationMS.repository.NotificationRepository;

import com.hms.NotificationMS.dto.NotificationDTO;

@Service 
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository){
        this.notificationRepository = notificationRepository;
    }

    @Override
    public List<NotificationDTO> getNotificationsForPatient(Long patientId) {
        return notificationRepository
                .findByRecipientIdAndRecipientRoleOrderByCreatedAtDesc(patientId, "PATIENT")
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    public List<NotificationDTO> getNotificationsForDoctor(Long doctorId) {
        return notificationRepository
                .findByRecipientIdAndRecipientRoleOrderByCreatedAtDesc(doctorId, "DOCTOR")
                .stream()
                .map(this::toDTO)
                .toList();
    }

    private NotificationDTO toDTO(Notification notification) {
        return new NotificationDTO(
            notification.getId(),
            notification.getEventId(),
            notification.getAppointmentId(),
            notification.getRecipientId(),
            notification.getRecipientRole(),
            notification.getRecipientEmail(),
            notification.getRecipientPhone(),
            notification.getTitle(),
            notification.getMessage(),
            notification.getStatus(),
            notification.getCreatedAt(),
            notification.getSentAt()
        );
    }


	@Override
	public void processAppointmentEvent(HmsEvent<AppointmentEventPayload> event) {
		AppointmentEventPayload payload = event.getPayload();

        switch (event.getEventType()) {
            case APPOINTMENT_CREATED:
                handleAppointmentCreated(event, payload);
                break;
            case APPOINTMENT_CANCELLED:
                handleAppointmentCancelled(event, payload);
                break;
            case APPOINTMENT_RESCHEDULED:
                handleAppointmentRescheduled(event, payload);
                break;
            case APPOINTMENT_COMPLETED:
                handleAppointmentCompleted(event, payload);
                break;
            case APPOINTMENT_EXPIRED:
                handleAppointmentExpired(event, payload);
                break;
            default:
                break;
        }
	}

    // Each of the handling Methods implementation
    private void handleAppointmentCreated(HmsEvent<AppointmentEventPayload> event, AppointmentEventPayload payload) {
        String eventId = event.getEventId();

        Notification patientNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getPatientId(),
            "PATIENT",
            payload.getPatientEmail(),
            payload.getPatientPhone(),
            "Appointment Scheduled",
            "Your appointment with Dr. " + payload.getDoctorName() + " is scheduled for " + payload.getAppointmentDateTime()
        );        

        Notification doctorNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getDoctorId(),
            "DOCTOR",
            payload.getDoctorEmail(),
            payload.getDoctorPhone(),
            "New Appointment",
            "You have a new appointment with patient " + payload.getPatientName() + " on " + payload.getAppointmentDateTime()
        );

        notificationRepository.saveAll(List.of(patientNotification, doctorNotification));
    }   

    private void handleAppointmentCancelled(HmsEvent<AppointmentEventPayload> event, AppointmentEventPayload payload) {
        String eventId = event.getEventId();

        Notification patientNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getPatientId(),
            "PATIENT",
            payload.getPatientEmail(),
            payload.getPatientPhone(),
            "Appointment Cancelled",
            "Your appointment with Dr. " + payload.getDoctorName() + " on " + payload.getAppointmentDateTime() + " has been cancelled."
        );

        Notification doctorNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getDoctorId(),
            "DOCTOR",
            payload.getDoctorEmail(),
            payload.getDoctorPhone(),
            "Appointment Cancelled",
            "Appointment with patient " + payload.getPatientName() + " on " + payload.getAppointmentDateTime() + " has been cancelled."
        );

        notificationRepository.saveAll(List.of(patientNotification, doctorNotification));
    }

    private void handleAppointmentRescheduled(HmsEvent<AppointmentEventPayload> event, AppointmentEventPayload payload) {
        String eventId = event.getEventId();

        Notification patientNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getPatientId(),
            "PATIENT",
            payload.getPatientEmail(),
            payload.getPatientPhone(),
            "Appointment Rescheduled",
            "Your appointment with Dr. " + payload.getDoctorName() + " has been rescheduled to " + payload.getAppointmentDateTime()
        );

        Notification doctorNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getDoctorId(),
            "DOCTOR",
            payload.getDoctorEmail(),
            payload.getDoctorPhone(),
            "Appointment Rescheduled",
            "Appointment with patient " + payload.getPatientName() + " has been rescheduled to " + payload.getAppointmentDateTime()
        );

        notificationRepository.saveAll(List.of(patientNotification, doctorNotification));
    }

    private void handleAppointmentCompleted(HmsEvent<AppointmentEventPayload> event, AppointmentEventPayload payload) {
        String eventId = event.getEventId();

        Notification patientNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getPatientId(),
            "PATIENT",
            payload.getPatientEmail(),
            payload.getPatientPhone(),
            "Appointment Completed",
            "Your appointment with Dr. " + payload.getDoctorName() + " has been completed."
        );

        Notification doctorNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getDoctorId(),
            "DOCTOR",
            payload.getDoctorEmail(),
            payload.getDoctorPhone(),
            "Appointment Completed",
            "Appointment with patient " + payload.getPatientName() + " marked as completed."
        );

        notificationRepository.saveAll(List.of(patientNotification, doctorNotification));
    }

    private void handleAppointmentExpired(HmsEvent<AppointmentEventPayload> event, AppointmentEventPayload payload) {
        String eventId = event.getEventId();

        Notification patientNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getPatientId(),
            "PATIENT",
            payload.getPatientEmail(),
            payload.getPatientPhone(),
            "Appointment Expired",
            "Your appointment request with Dr. " + payload.getDoctorName() + " for " + payload.getAppointmentDateTime() + " has expired."
        );

        Notification doctorNotification = notificationBuilder(
            eventId, 
            payload.getAppointmentId(),
            payload.getDoctorId(),
            "DOCTOR",
            payload.getDoctorEmail(),
            payload.getDoctorPhone(),
            "Appointment Expired",
            "Appointment request with patient " + payload.getPatientName() + " for " + payload.getAppointmentDateTime() + " has expired."
        );

        notificationRepository.saveAll(List.of(patientNotification, doctorNotification));
    }

    // helper functions 
    private Notification notificationBuilder(String eventId, Long appointmentId, Long recipientId, String recipientRole, String recipientEmail, String recipientPhone, String title, String message) {
        Notification notification = new Notification();
        notification.setEventId(eventId);
        notification.setAppointmentId(appointmentId);
        notification.setRecipientId(recipientId);
        notification.setRecipientRole(recipientRole);
        notification.setRecipientEmail(recipientEmail);
        notification.setRecipientPhone(recipientPhone);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setStatus(NotificationStatus.PENDING);
        notification.setCreatedAt(LocalDateTime.now());
        return notification;
    }
}


