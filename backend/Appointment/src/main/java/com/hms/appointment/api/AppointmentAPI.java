package com.hms.appointment.api;

import com.hms.appointment.dto.*;
import com.hms.appointment.exception.ForbiddenException;
import com.hms.appointment.exception.HmsException;
import com.hms.appointment.service.AppointmentService;
import com.hms.appointment.service.PrescriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/appointment")
@Validated
public class AppointmentAPI {

    @Autowired
    private AppointmentService appointmentService;
    @Autowired
    private PrescriptionService prescriptionService;

    @PostMapping("/schedule")
    public ResponseEntity<Long> scheduleAppointment(@RequestBody AppointmentDTO appointmentDTO,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Profile-Id", required = false) Long profileId) throws HmsException {
        // Identity headers are set by the Gateway from the verified JWT (clients cannot forge them).
        if ("PATIENT".equals(role) && !Objects.equals(appointmentDTO.getPatientId(), profileId)) {
            throw new ForbiddenException("Patients can only book appointments for themselves.");
        }
        if ("DOCTOR".equals(role) && !Objects.equals(appointmentDTO.getDoctorId(), profileId)) {
            throw new ForbiddenException("Doctors can only book appointments in their own schedule.");
        }
        return new ResponseEntity<>(appointmentService.scheduleAppointment(appointmentDTO), HttpStatus.CREATED);
    }

    @PutMapping("/cancel/{appointmentId}")
    public ResponseEntity<String> cancelAppointment(@PathVariable long appointmentId) throws HmsException {
        appointmentService.cancelAppointment(appointmentId);
        return new ResponseEntity<>("Appointment Cancelled", HttpStatus.OK);
    }

    @GetMapping("/get/{appointmentId}")
    public ResponseEntity<AppointmentDTO> getAppointmentDetails(@PathVariable Long appointmentId) throws HmsException {
        return new ResponseEntity<>(appointmentService.getAppointmentDetails(appointmentId), HttpStatus.OK);
    }

    @GetMapping("/get/details/{appointmentId}")
    public ResponseEntity<AppointmentDetails> getAppointmentDetailsWithName(@PathVariable Long appointmentId)
            throws HmsException {
        return new ResponseEntity<>(appointmentService.getAppointmentDetailsWithName(appointmentId), HttpStatus.OK);
    }

    @GetMapping("/getAllByPatient/{patientId}")
    public ResponseEntity<List<AppointmentDetails>> getAllAppointmentByPatientId(@PathVariable Long patientId)
            throws HmsException {
        return new ResponseEntity<>(appointmentService.getAllAppointmentsByPatientId(patientId), HttpStatus.OK);
    }

    @GetMapping("/getAllByDoctor/{doctorId}")
    public ResponseEntity<List<AppointmentDetails>> getAllAppointmentsByDoctor(@PathVariable Long doctorId)
            throws HmsException {
        return new ResponseEntity<>(appointmentService.getAllAppointmentsByDoctorId(doctorId), HttpStatus.OK);
    }

    @GetMapping("/countByPatient/{patientId}")
    public ResponseEntity<List<MonthlyVisitDTO>> getAppointmentCountByPatientId(@PathVariable Long patientId)
            throws HmsException {
        return new ResponseEntity<>(appointmentService.getAppointmentCountByPatient(patientId), HttpStatus.OK);
    }

    @GetMapping("/countByDoctor/{doctorId}")
    public ResponseEntity<List<MonthlyVisitDTO>> getAppointmentCountByDoctorId(@PathVariable Long doctorId)
            throws HmsException {
        return new ResponseEntity<>(appointmentService.getAppointmentCountByDoctor(doctorId), HttpStatus.OK);
    }

    @GetMapping("/visitCount")
    public ResponseEntity<List<MonthlyVisitDTO>> getAppointmentCounts() throws HmsException {
        return new ResponseEntity<>(appointmentService.getAppointmentCounts(), HttpStatus.OK);
    }

    @GetMapping("/countReasonByPatient/{patientId}")
    public ResponseEntity<List<ReasonCountDTO>> getReasonsByPatient(@PathVariable Long patientId) {
        return new ResponseEntity<>(appointmentService.getReasonCountByPatient(patientId), HttpStatus.OK);
    }

    @GetMapping("/countReasonByDoctor/{doctorId}")
    public ResponseEntity<List<ReasonCountDTO>> getReasonsByDoctor(@PathVariable Long doctorId) {
        return new ResponseEntity<>(appointmentService.getReasonCountByDoctor(doctorId), HttpStatus.OK);
    }

    @GetMapping("/countReasons")
    public ResponseEntity<List<ReasonCountDTO>> getReasons() {
        return new ResponseEntity<>(appointmentService.getReasonCount(), HttpStatus.OK);
    }

    @GetMapping("/getMedicinesByPatient/{patientId}")
    public ResponseEntity<List<MedicineDTO>> getMedicinesByPatientId(@PathVariable Long patientId) throws HmsException {
        return new ResponseEntity<>(prescriptionService.getMedicineByPatientId(patientId), HttpStatus.OK);
    }

    @GetMapping("/today")
    public ResponseEntity<List<AppointmentDetails>> getTodayAppointment(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Profile-Id", required = false) Long profileId) throws HmsException {
        List<AppointmentDetails> today = appointmentService.getTodaysAppointments();
        if ("DOCTOR".equals(role)) {
            // a doctor sees only their own appointments of the day (admin sees all)
            today = today.stream().filter(a -> Objects.equals(a.getDoctorId(), profileId)).toList();
        }
        return new ResponseEntity<>(today, HttpStatus.OK);
    }

    @GetMapping("/patients/doctor/{doctorId}")
    public ResponseEntity<List<Long>> getPatientIdsByDoctorId(@PathVariable Long doctorId) {
        return new ResponseEntity<>(appointmentService.getPatientIdsByDoctorId(doctorId), HttpStatus.OK);
    }

    @GetMapping("/patients/doctor/{doctorId}/metrics")
    public ResponseEntity<List<MonthlyVisitDTO>> getUniquePatientCountsByDoctor(@PathVariable Long doctorId) {
        return new ResponseEntity<>(appointmentService.getUniquePatientCountsByDoctor(doctorId), HttpStatus.OK);
    }

    @GetMapping("/patients/doctor/{doctorId}/dropdown")
    public ResponseEntity<List<PatientDTO>> getPatientDropDown(@PathVariable Long doctorId) {
        return new ResponseEntity<>(appointmentService.getPatientDropDown(doctorId), HttpStatus.OK);
    }

    // ---------------------------------------------------------------------
    // Admin: every appointment in HMS (paginated, optional filters).
    // GET /appointment/all?page=0&size=20&status=SCHEDULED&from=2026-09-01T00:00:00&to=...&doctorId=&patientId=&sort=asc
    // ---------------------------------------------------------------------
    @GetMapping("/all")
    public ResponseEntity<AppointmentPage<AdminAppointmentDetails>> getAllAppointments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long patientId,
            @RequestParam(defaultValue = "desc") String sort) {
        return new ResponseEntity<>(appointmentService.getAllAppointments(page, size, status, from, to, doctorId,
                patientId, "asc".equalsIgnoreCase(sort)), HttpStatus.OK);
    }

    @GetMapping("/all/status-counts")
    public ResponseEntity<List<StatusCountDTO>> getStatusCounts() {
        return new ResponseEntity<>(appointmentService.getStatusCounts(), HttpStatus.OK);
    }

    // Slot picker: active (SCHEDULED/COMPLETED) appointment times of a doctor around a date.
    // GET /appointment/doctor/{doctorId}/booked-slots?date=2026-09-20
    @GetMapping("/doctor/{doctorId}/booked-slots")
    public ResponseEntity<List<LocalDateTime>> getBookedSlots(@PathVariable Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return new ResponseEntity<>(appointmentService.getBookedTimes(doctorId, date), HttpStatus.OK);
    }
}
