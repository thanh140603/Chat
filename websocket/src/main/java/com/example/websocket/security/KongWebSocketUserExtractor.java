package com.example.websocket.security;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;

/**
 * Utility class lấy user information từ Kong Gateway headers cho WebSocket
 */
@Component
public class KongWebSocketUserExtractor {

    private static final Logger log = LoggerFactory.getLogger(KongWebSocketUserExtractor.class);

    public static final String USER_ID_HEADER = "X-Kong-Jwt-Claim-Uid";
    public static final String USERNAME_HEADER = "X-Kong-Jwt-Claim-Sub";

    private final SecretKey secretKey;

    public KongWebSocketUserExtractor(@Value("${app.jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    
    /**
     * Get userId from Kong headers or JWT token
     */
    public String getUserId(ServerHttpRequest request) {
        String fromHeader = request.getHeaders().getFirst(USER_ID_HEADER);
        if (StringUtils.hasText(fromHeader)) {
            return fromHeader;
        }
        return getClaimFromToken(request, "uid");
    }
    
    /**
     * Get username from Kong headers or JWT token
     */
    public String getUsername(ServerHttpRequest request) {
        String fromHeader = request.getHeaders().getFirst(USERNAME_HEADER);
        if (StringUtils.hasText(fromHeader)) {
            return fromHeader;
        }
        return getClaimFromToken(request, "sub");
    }
    
    /**
     * Check if user is authenticated
     */
    public boolean isAuthenticated(ServerHttpRequest request) {
        String userId = getUserId(request);
        return StringUtils.hasText(userId);
    }
    
    /**
     * Get user info as object
     */
    public KongWebSocketUserInfo getUserInfo(ServerHttpRequest request) {
        return new KongWebSocketUserInfo(
            getUserId(request),
            getUsername(request)
        );
    }
    
    /**
     * Add user info to WebSocket session attributes
     */
    public void addUserInfoToAttributes(ServerHttpRequest request, Map<String, Object> attributes) {
        KongWebSocketUserInfo userInfo = getUserInfo(request);
        if (userInfo.isValid()) {
            attributes.put("userId", userInfo.getUserId());
            attributes.put("username", userInfo.getUsername());
            String token = getAccessToken(request);
            if (StringUtils.hasText(token)) {
                attributes.put("accessToken", token);
            }
        }
    }

    public String getAccessToken(ServerHttpRequest request) {
        return extractToken(request);
    }

    private String getClaimFromToken(ServerHttpRequest request, String claimKey) {
        Claims claims = parseToken(request);
        if (claims == null) {
            return null;
        }
        Object value = claims.get(claimKey);
        return value != null ? value.toString() : null;
    }

    private Claims parseToken(ServerHttpRequest request) {
        String token = extractToken(request);
        if (!StringUtils.hasText(token)) {
            return null;
        }
        try {
            Jws<Claims> jws = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token);
            return jws.getBody();
        } catch (JwtException ex) {
            log.warn("Failed to parse JWT from WebSocket request", ex);
            return null;
        }
    }

    private String extractToken(ServerHttpRequest request) {
        String token = request.getHeaders().getFirst("Authorization");
        if (StringUtils.hasText(token)) {
            if (token.startsWith("Bearer ")) {
                return token.substring(7);
            }
            return token;
        }

        return UriComponentsBuilder.fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst("jwt");
    }
    
    /**
     * Data class containing user info from Kong Gateway
     */
    public static class KongWebSocketUserInfo {
        private final String userId;
        private final String username;
        
        public KongWebSocketUserInfo(String userId, String username) {
            this.userId = userId;
            this.username = username;
        }
        
        public String getUserId() {
            return userId;
        }
        
        public String getUsername() {
            return username;
        }
        
        public boolean isValid() {
            return userId != null && !userId.trim().isEmpty();
        }
    }
}
