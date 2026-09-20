package com.hms.gateway.security;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BiFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;

import reactor.core.publisher.Mono;

/**
 * Central, fail-closed access policy for every authenticated request that passes the Gateway.
 *
 *   ADMIN   - everything (except internal service-to-service endpoints).
 *   PATIENT - only their own patient id; may read doctor directory / free slots; books and
 *             cancels only their own appointments (booking body is re-checked in AppointmentMS).
 *   DOCTOR  - their own doctor id; patient data only for patients who have an appointment with
 *             them (asked from AppointmentMS, see RelationClient); reports only for their own
 *             appointments (re-checked in AppointmentMS); pharmacy medicines (doctor pharmacy page).
 *
 * Any path not listed below is DENIED. Body-level ownership (booking, profile update, report
 * create/update) is enforced in the owning service with the X-User-Role / X-Profile-Id headers
 * the Gateway sets from the verified token.
 */
@Component
public class AccessPolicy {

    private static final String ADMIN = "ADMIN";
    private static final String PATIENT = "PATIENT";
    private static final String DOCTOR = "DOCTOR";

    private record Ctx(Identity id, Matcher m, MultiValueMap<String, String> query) {
        Long pathId(int group) {
            try {
                return Long.valueOf(m.group(group));
            } catch (RuntimeException e) {
                return null;
            }
        }
    }

    private record Rule(HttpMethod method, Pattern pattern, BiFunction<AccessPolicy, Ctx, Mono<Decision>> check) {
    }

    private final RelationClient relations;
    private final List<Rule> rules = new ArrayList<>();

    public AccessPolicy(RelationClient relations) {
        this.relations = relations;

        // ---------------- internal service-to-service endpoints: never through the Gateway
        any("^/appointment/internal/.*$", (p, c) -> Mono.just(Decision.deny("Internal endpoint")));

        // ---------------- UserMS (login/register are handled before the policy)
        rule(HttpMethod.GET, "^/users?/getProfile/(\\d+)$", (p, c) -> p.userSelf(c, 1));
        rule(HttpMethod.GET, "^/users?/getRegistrationCounts$", (p, c) -> p.roles(c, ADMIN));
        rule(HttpMethod.GET, "^/users?/test$", (p, c) -> p.authenticated());

        // ---------------- ProfileMS: patients
        rule(HttpMethod.GET, "^/profile/patient/(get|exists|getProfileId)/(\\d+)$", (p, c) -> p.patientData(c, 2));
        rule(HttpMethod.PUT, "^/profile/patient/update$", (p, c) -> p.roles(c, ADMIN, PATIENT)); // body id checked in ProfileMS
        rule(HttpMethod.GET, "^/profile/patient/getAll$", (p, c) -> p.roles(c, ADMIN));
        rule(HttpMethod.GET, "^/profile/patient/(getPatientsById|getPatientsDetailsByIds)$", (p, c) -> p.patientIdsQuery(c, "ids"));
        // ---------------- ProfileMS: doctors (public directory for signed-in users)
        rule(HttpMethod.GET, "^/profile/doctor/(get|exists|getProfileId)/(\\d+)$", (p, c) -> p.authenticated());
        rule(HttpMethod.GET, "^/profile/doctor/(dropdowns|getDoctorsById)$", (p, c) -> p.authenticated());
        rule(HttpMethod.PUT, "^/profile/doctor/update$", (p, c) -> p.roles(c, ADMIN, DOCTOR)); // body id checked in ProfileMS
        rule(HttpMethod.GET, "^/profile/doctor/(getAll|getDoctorsDetailsByIds)$", (p, c) -> p.roles(c, ADMIN));
        // /profile/*/add is only called internally by UserMS (Feign) -> not listed -> denied

        // ---------------- AppointmentMS: appointments
        rule(HttpMethod.POST, "^/appointment/schedule$", (p, c) -> p.roles(c, ADMIN, PATIENT, DOCTOR)); // body checked in AppointmentMS
        rule(HttpMethod.PUT, "^/appointment/cancel/(\\d+)$", (p, c) -> p.appointmentOwner(c, 1));
        rule(HttpMethod.GET, "^/appointment/get/(\\d+)$", (p, c) -> p.appointmentRead(c, 1));
        rule(HttpMethod.GET, "^/appointment/get/details/(\\d+)$", (p, c) -> p.appointmentRead(c, 1));
        rule(HttpMethod.GET, "^/appointment/(getAllByPatient|countByPatient|countReasonByPatient|getMedicinesByPatient)/(\\d+)$",
                (p, c) -> p.patientData(c, 2));
        rule(HttpMethod.GET, "^/appointment/(getAllByDoctor|countByDoctor|countReasonByDoctor)/(\\d+)$", (p, c) -> p.doctorSelf(c, 2));
        rule(HttpMethod.GET, "^/appointment/patients/doctor/(\\d+)(/metrics|/dropdown)?$", (p, c) -> p.doctorSelf(c, 1));
        rule(HttpMethod.GET, "^/appointment/doctor/(\\d+)/booked-slots$", (p, c) -> p.authenticated()); // times only
        rule(HttpMethod.GET, "^/appointment/(visitCount|countReasons|all|all/status-counts)$", (p, c) -> p.roles(c, ADMIN));
        rule(HttpMethod.GET, "^/appointment/today$", (p, c) -> p.roles(c, ADMIN, DOCTOR)); // doctors get only their own (AppointmentMS)

        // ---------------- AppointmentMS: reports & prescriptions
        rule(HttpMethod.POST, "^/appointment/report/create$", (p, c) -> p.roles(c, ADMIN, DOCTOR)); // own appointment checked in AppointmentMS
        rule(HttpMethod.PUT, "^/appointment/report/update$", (p, c) -> p.roles(c, ADMIN, DOCTOR));  // own record checked in AppointmentMS
        rule(HttpMethod.GET, "^/appointment/report/(getByAppointmentId|getDetailsByAppointmentId|isRecordExists)/(\\d+)$",
                (p, c) -> p.appointmentRead(c, 2));
        rule(HttpMethod.GET, "^/appointment/report/(getRecordsByPatientId|getPrescriptionsByPatientId)/(\\d+)$", (p, c) -> p.patientData(c, 2));
        rule(HttpMethod.GET, "^/appointment/report/getById/(\\d+)$", (p, c) -> p.roles(c, ADMIN));
        rule(HttpMethod.GET, "^/appointment/report/(getAllPrescriptions|getMedicinesByPrescriptionId/\\d+)$", (p, c) -> p.roles(c, ADMIN));
        rule(HttpMethod.GET, "^/appointment/prescription/patient/(\\d+)$", (p, c) -> p.patientData(c, 1));
        rule(HttpMethod.GET, "^/appointment/prescription/get/appointment/(\\d+)$", (p, c) -> p.appointmentRead(c, 1));
        any("^/appointment/prescription/.*$", (p, c) -> p.roles(c, ADMIN));

        // ---------------- PharmacyMS
        rule(HttpMethod.GET, "^/pharmacy/medicine/(getAll|get/\\d+)$", (p, c) -> p.roles(c, ADMIN, DOCTOR));
        rule(HttpMethod.POST, "^/pharmacy/medicine/add$", (p, c) -> p.roles(c, ADMIN, DOCTOR));
        rule(HttpMethod.PUT, "^/pharmacy/medicine/update$", (p, c) -> p.roles(c, ADMIN, DOCTOR));
        any("^/pharmacy/(inventory|sales)/.*$", (p, c) -> p.roles(c, ADMIN));

        // ---------------- NotificationMS
        rule(HttpMethod.GET, "^/notification/patient/(\\d+)$", (p, c) -> p.patientSelf(c, 1));
        rule(HttpMethod.GET, "^/notification/doctor/(\\d+)$", (p, c) -> p.doctorSelf(c, 1));
    }

    private void rule(HttpMethod method, String regex, BiFunction<AccessPolicy, Ctx, Mono<Decision>> check) {
        rules.add(new Rule(method, Pattern.compile(regex), check));
    }

    private void any(String regex, BiFunction<AccessPolicy, Ctx, Mono<Decision>> check) {
        rules.add(new Rule(null, Pattern.compile(regex), check));
    }

    public Mono<Decision> check(HttpMethod method, String path, MultiValueMap<String, String> query, Identity id) {
        for (Rule rule : rules) {
            Matcher m = rule.pattern().matcher(path);
            if (m.matches() && (rule.method() == null || rule.method().equals(method))) {
                return rule.check().apply(this, new Ctx(id, m, query))
                        .onErrorResume(e -> Mono.just(Decision.unavailable(
                                "Access check temporarily unavailable (AppointmentMS not reachable or outdated). Please retry.")));
            }
        }
        return Mono.just(Decision.deny("No access rule for " + method + " " + path));
    }

    // ------------------------------------------------------------------ checks

    private Mono<Decision> authenticated() {
        return Mono.just(Decision.ALLOW);
    }

    private Mono<Decision> roles(Ctx c, String... allowed) {
        for (String r : allowed) {
            if (r.equals(c.id().role())) {
                return Mono.just(Decision.ALLOW);
            }
        }
        return Mono.just(Decision.deny("Role " + c.id().role() + " is not allowed here"));
    }

    private Mono<Decision> userSelf(Ctx c, int group) {
        Long userId = c.pathId(group);
        return Mono.just(Decision.of(c.id().isAdmin() || (userId != null && userId.equals(c.id().userId())),
                "You can only access your own account"));
    }

    private Mono<Decision> doctorSelf(Ctx c, int group) {
        return Mono.just(Decision.of(c.id().isAdmin() || (c.id().isDoctor() && c.id().isProfile(c.pathId(group))),
                "You can only access your own doctor data"));
    }

    private Mono<Decision> patientSelf(Ctx c, int group) {
        return Mono.just(Decision.of(c.id().isAdmin() || (c.id().isPatient() && c.id().isProfile(c.pathId(group))),
                "You can only access your own patient data"));
    }

    /** Patient-owned data: admin, the patient themself, or a doctor the patient has an appointment with. */
    private Mono<Decision> patientData(Ctx c, int group) {
        Identity id = c.id();
        Long patientId = c.pathId(group);
        if (id.isAdmin()) {
            return Mono.just(Decision.ALLOW);
        }
        if (id.isPatient()) {
            return Mono.just(Decision.of(id.isProfile(patientId), "You can only access your own patient data"));
        }
        if (id.isDoctor() && id.profileId() != null && patientId != null) {
            return relations.doctorHasPatients(id.profileId(), List.of(patientId))
                    .map(ok -> Decision.of(ok, "This patient has no appointment with you"));
        }
        return Mono.just(Decision.deny("Not allowed"));
    }

    private Mono<Decision> patientIdsQuery(Ctx c, String param) {
        Identity id = c.id();
        if (id.isAdmin()) {
            return Mono.just(Decision.ALLOW);
        }
        List<Long> ids = new ArrayList<>();
        for (String raw : c.query().getOrDefault(param, List.of())) {
            for (String part : raw.split(",")) {
                if (part.isBlank()) {
                    continue;
                }
                try {
                    ids.add(Long.valueOf(part.trim()));
                } catch (NumberFormatException e) {
                    return Mono.just(Decision.deny("Invalid id list"));
                }
            }
        }
        if (id.isPatient()) {
            return Mono.just(Decision.of(ids.stream().allMatch(id::isProfile), "You can only access your own patient data"));
        }
        if (id.isDoctor() && id.profileId() != null) {
            return relations.doctorHasPatients(id.profileId(), ids)
                    .map(ok -> Decision.of(ok, "Some of these patients have no appointment with you"));
        }
        return Mono.just(Decision.deny("Not allowed"));
    }

    /** Read access to one appointment (and its report/prescription). */
    private Mono<Decision> appointmentRead(Ctx c, int group) {
        Identity id = c.id();
        if (id.isAdmin()) {
            return Mono.just(Decision.ALLOW);
        }
        Long appointmentId = c.pathId(group);
        if (appointmentId == null || id.profileId() == null) {
            return Mono.just(Decision.deny("Not allowed"));
        }
        return relations.parties(appointmentId)
                .flatMap(parties -> {
                    if (id.isPatient()) {
                        return Mono.just(Decision.of(id.isProfile(parties.patientId()), "Not your appointment"));
                    }
                    if (id.isDoctor()) {
                        if (id.isProfile(parties.doctorId())) {
                            return Mono.just(Decision.ALLOW);
                        }
                        // another doctor's visit of one of MY patients (medical history)
                        return relations.doctorHasPatients(id.profileId(), List.of(parties.patientId()))
                                .map(ok -> Decision.of(ok, "Not your appointment or patient"));
                    }
                    return Mono.just(Decision.deny("Not allowed"));
                })
                // unknown appointment: let the service answer (it returns "Appointment not found")
                .defaultIfEmpty(Decision.ALLOW);
    }

    /** Changing an appointment (cancel): only its own patient or doctor, or admin. */
    private Mono<Decision> appointmentOwner(Ctx c, int group) {
        Identity id = c.id();
        if (id.isAdmin()) {
            return Mono.just(Decision.ALLOW);
        }
        Long appointmentId = c.pathId(group);
        if (appointmentId == null || id.profileId() == null) {
            return Mono.just(Decision.deny("Not allowed"));
        }
        return relations.parties(appointmentId)
                .map(parties -> Decision.of(
                        (id.isPatient() && id.isProfile(parties.patientId())) || (id.isDoctor() && id.isProfile(parties.doctorId())),
                        "Not your appointment"))
                .defaultIfEmpty(Decision.ALLOW);
    }
}
