package com.hms.NotificationMS.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.hms.NotificationMS.event.AppointmentEventPayload;
import com.hms.NotificationMS.event.HmsEvent;
import com.hms.NotificationMS.service.NotificationService;

@Service
public class AppointmentEventConsumer {
    
    private final NotificationService notificationService;

    public AppointmentEventConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @KafkaListener(
        topics = "${hms.kafka.topic.appointment}",
            groupId = "notification-group"
    )
    public void consume(HmsEvent<AppointmentEventPayload> event){
        // handle the incoming event
        System.out.println(
            "Received appointment event: "
            + event.getEventType()
            + " | eventId: "
            + event.getEventId()
        );

        notificationService.processAppointmentEvent(event);
    }
}

