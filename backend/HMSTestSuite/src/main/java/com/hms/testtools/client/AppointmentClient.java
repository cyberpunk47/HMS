package com.hms.testtools.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import com.hms.testtools.dto.AppointmentDTO;
import com.hms.testtools.dto.AppointmentDetails;
import com.hms.testtools.dto.ApRecordDTO;
import com.hms.testtools.dto.PrescriptionDTO;
import com.hms.testtools.dto.PrescriptionDetails;
import java.util.List;

@FeignClient(
    name = "appointment-client",
    url = "${gateway.url}"
)
public interface AppointmentClient {

    @PostMapping("/appointment/schedule")
    Long scheduleAppointment(@RequestBody AppointmentDTO appointmentDTO);

    @PutMapping("/appointment/cancel/{appointmentId}")
    String cancelAppointment(@PathVariable("appointmentId") Long appointmentId);

    @GetMapping("/appointment/get/{appointmentId}")
    AppointmentDTO getAppointmentDetails(@PathVariable("appointmentId") Long appointmentId);

    @GetMapping("/appointment/get/details/{appointmentId}")
    AppointmentDetails getAppointmentDetailsWithName(@PathVariable("appointmentId") Long appointmentId);

    @GetMapping("/appointment/today")
    List<AppointmentDetails> getTodayAppointments();

    // Reports / Records
    @PostMapping("/appointment/report/create")
    Long createAppointmentReport(@RequestBody ApRecordDTO apRecordDTO);

    @GetMapping("/appointment/report/getByAppointmentId/{appointmentId}")
    ApRecordDTO getAppointmentReportByAppointmentId(@PathVariable("appointmentId") Long appointmentId);

    // Prescriptions
    @PostMapping("/appointment/prescription/create")
    Long createPrescription(@RequestBody PrescriptionDTO prescriptionDTO);

    @GetMapping("/appointment/prescription/get/{id}")
    PrescriptionDTO getPrescriptionById(@PathVariable("id") Long id);
}
