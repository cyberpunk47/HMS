package com.hms.NotificationMS.consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.hms.NotificationMS.event.AppointmentEventPayload;
import com.hms.NotificationMS.event.HmsEvent;
import com.hms.NotificationMS.service.NotificationService;

@Service
public class AppointmentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(AppointmentEventConsumer.class);
    
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
        // DEBUG level: one line per event is very high volume during booking benchmarks.
        log.debug("Received appointment event: {} | eventId: {}", event.getEventType(), event.getEventId());

        notificationService.processAppointmentEvent(event);
    }
}

