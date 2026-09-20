package com.hms.gateway.filter;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import com.hms.gateway.security.AccessPolicy;
import com.hms.gateway.security.Identity;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import reactor.core.publisher.Mono;

/**
 * Authentication + authorization for every routed request.
 *
 * 1. Identity headers sent by the client (X-Secret-Key, X-User-Id, X-User-Role, X-Profile-Id)
 *    are always removed, so they can only come from here.
 * 2. The JWT is verified with the per-environment secret (JWT_SECRET). A token signed anywhere
 *    else (e.g. a local machine with a different secret) is rejected with 401.
 * 3. AccessPolicy decides role/ownership; denied requests get 403 (JSON like the services' ErrorInfo).
 * 4. Allowed requests are forwarded with the internal secret and the trusted identity headers.
 */
@Component
public class TokenFilter extends AbstractGatewayFilterFactory<TokenFilter.Config> {

    public static final String HEADER_SECRET = "X-Secret-Key";
    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_ROLE = "X-User-Role";
    public static final String HEADER_PROFILE_ID = "X-Profile-Id";
    private static final List<String> OPEN_PATHS = List.of("/user/login", "/user/register", "/users/login", "/users/register");

    private final String secret;
    private final String internalSecret;
    private final AccessPolicy accessPolicy;

    public TokenFilter(@Value("${hms.jwt.secret:}") String secret,
            @Value("${hms.security.internal-secret:SECRET}") String internalSecret,
            AccessPolicy accessPolicy) {
        super(Config.class);
        this.secret = validateSecret(secret);
        this.internalSecret = internalSecret;
        this.accessPolicy = accessPolicy;
    }

    // Same key format as UserMS (jjwt 0.11 base64 string key). HS512 needs >= 64 bytes of key.
    static String validateSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not set. Generate one with: openssl rand -base64 64");
        }
        byte[] key;
        try {
            key = Base64.getDecoder().decode(secret.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT_SECRET must be base64 (use: openssl rand -base64 64)");
        }
        if (key.length < 64) {
            throw new IllegalStateException("JWT_SECRET is too short for HS512 (" + key.length + " bytes, need >= 64)");
        }
        return secret.trim();
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            if (request.getMethod() == HttpMethod.OPTIONS) {
                return chain.filter(exchange);
            }
            String path = request.getPath().value();
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            if (OPEN_PATHS.contains(path)) {
                // Login/register need no token. If a valid token IS sent (e.g. an admin creating
                // another admin) its identity is forwarded; an invalid one is simply ignored.
                Identity caller = authHeader == null ? null : parse(authHeader);
                return chain.filter(forward(exchange, caller));
            }

            if (authHeader == null) {
                return reject(exchange, HttpStatus.UNAUTHORIZED, "Authentication header is missing");
            }
            Identity identity = parse(authHeader);
            if (identity == null) {
                return reject(exchange, HttpStatus.UNAUTHORIZED, "Token is invalid or expired");
            }
            return accessPolicy.check(request.getMethod(), path, request.getQueryParams(), identity)
                    .flatMap(decision -> decision.allowed()
                            ? chain.filter(forward(exchange, identity))
                            : reject(exchange, decision.unavailable() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.FORBIDDEN,
                                    decision.reason()));
        };
    }

    private Identity parse(String authHeader) {
        if (!authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        try {
            Claims claims = Jwts.parser().setSigningKey(secret).parseClaimsJws(authHeader.substring(7).trim()).getBody();
            String role = claims.get("role") == null ? null : String.valueOf(claims.get("role"));
            Long userId = toLong(claims.get("id"));
            if (role == null || userId == null) {
                return null;
            }
            return new Identity(userId, role, toLong(claims.get("profileId")));
        } catch (Exception e) {
            return null;
        }
    }

    private static Long toLong(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return v == null ? null : Long.valueOf(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private ServerWebExchange forward(ServerWebExchange exchange, Identity identity) {
        ServerHttpRequest mutated = exchange.getRequest().mutate().headers(h -> {
            h.remove(HEADER_SECRET);
            h.remove(HEADER_USER_ID);
            h.remove(HEADER_ROLE);
            h.remove(HEADER_PROFILE_ID);
            h.set(HEADER_SECRET, internalSecret);
            if (identity != null) {
                h.set(HEADER_USER_ID, String.valueOf(identity.userId()));
                h.set(HEADER_ROLE, identity.role());
                if (identity.profileId() != null) {
                    h.set(HEADER_PROFILE_ID, String.valueOf(identity.profileId()));
                }
            }
        }).build();
        return exchange.mutate().request(mutated).build();
    }

    private Mono<Void> reject(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"errorMessage\":\"" + message.replace("\\", "\\\\").replace("\"", "\\\"")
                + "\",\"errorCode\":" + status.value() + ",\"timestamp\":\"" + LocalDateTime.now() + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    public static class Config {

    }
}
