package com.hms.gateway.security;

/**
 * Result of an access check.
 *   allowed         -> request is forwarded
 *   denied          -> 403 (the caller is not allowed)
 *   unavailable     -> 503 (the check itself could not be completed, e.g. AppointmentMS is down or
 *                      running an old build without /appointment/internal/**). Still fail-closed,
 *                      but reported as an infrastructure problem instead of a permission problem.
 */
public record Decision(boolean allowed, boolean unavailable, String reason) {

    public static final Decision ALLOW = new Decision(true, false, null);

    public static Decision deny(String reason) {
        return new Decision(false, false, reason);
    }

    public static Decision unavailable(String reason) {
        return new Decision(false, true, reason);
    }

    public static Decision of(boolean allowed, String reasonIfDenied) {
        return allowed ? ALLOW : deny(reasonIfDenied);
    }
}
