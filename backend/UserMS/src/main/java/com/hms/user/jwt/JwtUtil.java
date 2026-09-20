package com.hms.user.jwt;

import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Component
public class JwtUtil {

    private static final Long JWT_TOKEN_VALIDITY = 5 * 60 * 60L;

    // Per-environment signing secret (JWT_SECRET). The Gateway must use the same value.
    // The previous hard-coded secret was shared by every environment (and is in git history),
    // so any token signed on one machine was valid everywhere.
    private final String secret;

    public JwtUtil(@Value("${hms.jwt.secret:}") String secret) {
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
        this.secret = secret.trim();
    }

    public String generateToken(UserDetails userDetails){
        Map<String, Object> claims = new HashMap<>();
        CustomUserDetails user = (CustomUserDetails) userDetails;
        claims.put("id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole());
        claims.put("name", user.getName());
        claims.put("profileId", user.getProfileId());
        return doGenerateToken(claims, userDetails.getUsername());
    }
    
    public String doGenerateToken(Map<String, Object> claims,String subject){
        return Jwts.builder().setClaims(claims).setSubject(subject).setIssuedAt(new Date(System.currentTimeMillis())).setExpiration(new Date(System.currentTimeMillis() + JWT_TOKEN_VALIDITY * 1000)).signWith(SignatureAlgorithm.HS512, secret).compact();
    }
}
