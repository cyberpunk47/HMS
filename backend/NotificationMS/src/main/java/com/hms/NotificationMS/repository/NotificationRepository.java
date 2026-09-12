package com.hms.NotificationMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.hms.NotificationMS.entity.Notification;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Optional<Notification> findByEventId(String eventId);
    List<Notification> findByRecipientIdAndRecipientRoleOrderByCreatedAtDesc(Long recipientId, String recipientRole);
}

