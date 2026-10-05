package com.hms.profile.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${springdoc.api-docs.enabled:false}")
    private boolean swaggerEnabled;

    private static boolean isSwaggerPath(String uri) {
        return uri != null && (uri.startsWith("/v3/api-docs") || uri.startsWith("/swagger-ui"));
    }

    /**
     * The only two endpoints this service answers without the gateway's internal
     * secret: the health check Kubernetes uses for its readiness and liveness
     * probes, and the metrics endpoint Prometheus scrapes. Neither returns
     * business data. The Service is ClusterIP, so neither is reachable from
     * outside the cluster; every other path still falls through to denyAll().
     */
    private static boolean isObservabilityPath(String uri) {
        if (uri == null) {
            return false;
        }
        return uri.equals("/actuator/health")
                || uri.startsWith("/actuator/health/")
                || uri.equals("/actuator/prometheus");
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf().disable()
                .authorizeHttpRequests(auth -> auth
                        // Temporary API discovery: Swagger/OpenAPI is reachable without the internal
                        // secret ONLY when SWAGGER_ENABLED=true (default false). Remove after benchmarking.
                        .requestMatchers(request -> swaggerEnabled && isSwaggerPath(request.getRequestURI()))
                        .permitAll()
                        .requestMatchers(request -> isObservabilityPath(request.getRequestURI()))
                                .permitAll()
                        .requestMatchers(request ->
                                "SECRET".equals(request.getHeader("X-Secret-Key")))
                        .permitAll()
                        .anyRequest().denyAll());

        return http.build();
    }
}