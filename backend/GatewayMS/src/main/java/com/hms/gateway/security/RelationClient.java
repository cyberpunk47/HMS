package com.hms.gateway.security;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.reactive.LoadBalancedExchangeFilterFunction;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.publisher.Mono;

/**
 * Asks AppointmentMS (the owner of doctor-patient relationships) whether an access is allowed.
 * Calls go straight to the service through the load balancer with the internal secret; the
 * /appointment/internal/** paths are never reachable through the Gateway routes.
 *
 * Caching keeps the extra hop off the hot path:
 *  - appointment parties (patientId/doctorId never change for an appointment id): cached, bounded
 *  - doctor -> patient relation: only POSITIVE answers cached (TTL), so a newly booked patient
 *    becomes visible immediately and nothing is granted from a stale negative.
 */
@Component
public class RelationClient {

    private static final Logger log = LoggerFactory.getLogger(RelationClient.class);
    private static final int MAX_CACHE = 200_000;
    private static final String HINT = "Is AppointmentMS up and running the current build "
            + "(it must expose /appointment/internal/**, class InternalAccessAPI)? Restart/rebuild it.";

    /** The access decision could not be made (AppointmentMS unreachable / old build / error). */
    public static class AccessCheckUnavailableException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        AccessCheckUnavailableException(Throwable cause) {
            super(cause);
        }
    }

    public record Parties(Long patientId, Long doctorId) {
    }

    private final WebClient client;
    private final String internalSecret;
    private final long relationTtlMillis;
    private final Duration timeout;

    private final Map<Long, Parties> partiesCache = new ConcurrentHashMap<>();
    private final Map<String, Long> relationCache = new ConcurrentHashMap<>();

    public RelationClient(LoadBalancedExchangeFilterFunction loadBalancer,
            @Value("${hms.security.appointment-service-url:http://AppointmentMS}") String baseUrl,
            @Value("${hms.security.internal-secret:SECRET}") String internalSecret,
            @Value("${hms.security.relation-cache-seconds:120}") long relationTtlSeconds,
            @Value("${hms.security.relation-timeout-ms:3000}") long timeoutMs) {
        this.client = WebClient.builder().baseUrl(baseUrl).filter(loadBalancer).build();
        this.internalSecret = internalSecret;
        this.relationTtlMillis = relationTtlSeconds * 1000;
        this.timeout = Duration.ofMillis(timeoutMs);
    }

    /** Participants of an appointment, or empty Mono if the appointment does not exist. */
    public Mono<Parties> parties(Long appointmentId) {
        Parties cached = partiesCache.get(appointmentId);
        if (cached != null) {
            return Mono.just(cached);
        }
        return client.get()
                .uri("/appointment/internal/appointments/{id}/parties", appointmentId)
                .header("X-Secret-Key", internalSecret)
                .retrieve()
                .bodyToMono(Parties.class)
                .timeout(timeout)
                .doOnNext(p -> {
                    if (partiesCache.size() > MAX_CACHE) {
                        partiesCache.clear();
                    }
                    partiesCache.put(appointmentId, p);
                })
                .onErrorResume(WebClientResponseException.NotFound.class, e -> Mono.empty())
                .onErrorMap(e -> !(e instanceof AccessCheckUnavailableException), e -> {
                    log.warn("Access check: appointment {} lookup failed: {}. {}", appointmentId, e.toString(), HINT);
                    return new AccessCheckUnavailableException(e);
                });
    }

    /** True when every patient id has (or had) an appointment with the doctor. Empty list = true. */
    public Mono<Boolean> doctorHasPatients(Long doctorId, List<Long> patientIds) {
        if (patientIds.isEmpty()) {
            return Mono.just(true);
        }
        long now = System.currentTimeMillis();
        List<Long> unknown = patientIds.stream()
                .filter(p -> {
                    Long exp = relationCache.get(doctorId + ":" + p);
                    return exp == null || exp < now;
                })
                .distinct()
                .toList();
        if (unknown.isEmpty()) {
            return Mono.just(true);
        }
        String ids = unknown.stream().map(String::valueOf).collect(Collectors.joining(","));
        return client.get()
                .uri(b -> b.path("/appointment/internal/doctor/{doctorId}/has-patients")
                        .queryParam("ids", ids).build(doctorId))
                .header("X-Secret-Key", internalSecret)
                .retrieve()
                .bodyToMono(Boolean.class)
                .timeout(timeout)
                .map(Boolean.TRUE::equals)
                .doOnNext(ok -> {
                    if (ok) {
                        if (relationCache.size() > MAX_CACHE) {
                            relationCache.clear();
                        }
                        long exp = System.currentTimeMillis() + relationTtlMillis;
                        unknown.forEach(p -> relationCache.put(doctorId + ":" + p, exp));
                    }
                })
                .onErrorMap(e -> {
                    log.warn("Access check: relation doctor={} patients={} failed: {}. {}", doctorId, ids, e.toString(), HINT);
                    return new AccessCheckUnavailableException(e); // fail closed -> 503, not a silent 403
                });
    }
}
