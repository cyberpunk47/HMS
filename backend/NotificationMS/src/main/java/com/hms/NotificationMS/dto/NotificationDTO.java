package com.hms.NotificationMS.dto;

import java.time.LocalDateTime;

import com.hms.NotificationMS.entity.NotificationStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationDTO {
    private Long id;
    private String eventId;
    private Long appointmentId;
    private Long recipientId;
    private String recipientRole;
    private String recipientEmail;
    private String recipientPhone;
    private String title;
    private String message;
    private NotificationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
}