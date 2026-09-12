package com.hms.NotificationMS.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hms.NotificationMS.dto.NotificationDTO;
import com.hms.NotificationMS.service.NotificationService;

@RestController 
@RequestMapping("/notification")
public class NotificationController {
    
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<NotificationDTO>> getPatientNotifications(@PathVariable Long patientId) {
        return ResponseEntity.ok(notificationService.getNotificationsForPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<NotificationDTO>> getDoctorNotifications(@PathVariable Long doctorId) {
        return ResponseEntity.ok(notificationService.getNotificationsForDoctor(doctorId));
    }

}

