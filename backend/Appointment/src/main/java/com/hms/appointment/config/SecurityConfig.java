package com.hms.appointment.config;

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


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf().disable()
                .authorizeHttpRequests(auth -> auth
                        // Temporary API discovery: Swagger/OpenAPI is reachable without the internal
                        // secret ONLY when SWAGGER_ENABLED=true (default false). Remove after benchmarking.
                        .requestMatchers(request -> swaggerEnabled && isSwaggerPath(request.getRequestURI()))
                        .permitAll()
                        .requestMatchers(request ->
                                "SECRET".equals(request.getHeader("X-Secret-Key")))
                        .permitAll()
                        .anyRequest().denyAll());

        return http.build();
    }
}