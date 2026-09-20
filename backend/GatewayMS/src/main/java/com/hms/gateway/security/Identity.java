package com.hms.gateway.security;

/**
 * Caller identity taken from a verified JWT. profileId is the patient/doctor profile id
 * (null for ADMIN).
 */
public record Identity(Long userId, String role, Long profileId) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    public boolean isPatient() {
        return "PATIENT".equals(role);
    }

    public boolean isDoctor() {
        return "DOCTOR".equals(role);
    }

    public boolean isProfile(Long id) {
        return profileId != null && profileId.equals(id);
    }
}
