package com.hms.profile.exception;

/**
 * The caller is authenticated but not allowed to do this (wrong role / not the owner).
 * Mapped to HTTP 403 by ExceptionControllerAdvice. The message is returned as-is.
 */
public class ForbiddenException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ForbiddenException(String message) {
        super(message);
    }
}
