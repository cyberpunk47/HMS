package com.hms.appointment.event;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class HmsEvent<T> {
    // We are going to make this a generic class so we dont have to change it if new Payloads were added suppose AppointmentRemainder or AppointmentInvoice

    private String eventId; // unique id for the event
    private EventType eventType;
    private Instant timestamp;
    private T payload;
    
}
