package com.hms.appointment.api;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hms.appointment.repository.AppointmentRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service-to-service endpoints used by the Gateway's access policy. They are protected by the
 * internal X-Secret-Key (SecurityConfig) and the Gateway denies /appointment/internal/** for
 * every client, so they are not reachable from outside.
 */
@RestController
@RequestMapping("/appointment/internal")
@RequiredArgsConstructor
public class InternalAccessAPI {

    private final AppointmentRepository appointmentRepository;

    @GetMapping("/appointments/{appointmentId}/parties")
    public ResponseEntity<Map<String, Long>> getParties(@PathVariable Long appointmentId) {
        return appointmentRepository.findById(appointmentId)
                .map(a -> ResponseEntity.ok(Map.of("patientId", a.getPatientId(), "doctorId", a.getDoctorId())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/doctor/{doctorId}/has-patients")
    public ResponseEntity<Boolean> doctorHasPatients(@PathVariable Long doctorId, @RequestParam List<Long> ids) {
        List<Long> distinct = ids.stream().distinct().toList();
        if (distinct.isEmpty()) {
            return ResponseEntity.ok(true);
        }
        return ResponseEntity.ok(appointmentRepository.countDistinctPatientsOfDoctor(doctorId, distinct) == distinct.size());
    }
}
