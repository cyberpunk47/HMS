package com.hms.appointment.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Appointment times are stored as wall-clock LocalDateTime values entered in the
 * hospital's time zone (the frontend formats them in Asia/Kolkata). Containers on
 * AWS run in UTC, so "now" comparisons must use the business zone, not the JVM
 * default zone. Override with HMS_BUSINESS_TIMEZONE if the hospital moves.
 */
@Configuration
public class BusinessClockConfig {

    @Bean
    public Clock businessClock(@Value("${hms.business-timezone:Asia/Kolkata}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
