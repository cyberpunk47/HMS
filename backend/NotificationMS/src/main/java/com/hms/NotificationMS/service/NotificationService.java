package com.hms.NotificationMS.service;

import java.util.List;
import com.hms.NotificationMS.dto.NotificationDTO;
import com.hms.NotificationMS.event.AppointmentEventPayload;
import com.hms.NotificationMS.event.HmsEvent;

public interface NotificationService {
    
    void processAppointmentEvent(HmsEvent<AppointmentEventPayload> event);

    List<NotificationDTO> getNotificationsForPatient(Long patientId);

    List<NotificationDTO> getNotificationsForDoctor(Long doctorId);

}

