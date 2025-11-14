package com.example.server.common.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Utility class để lấy user information từ Kong Gateway headers
 * Kong đã verify JWT và thêm user info vào headers
 */
@Component
public class KongUserExtractor {
    
    public static final String USER_ID_HEADER = "X-Kong-Jwt-Claim-Uid";
    public static final String USERNAME_HEADER = "X-Kong-Jwt-Claim-Sub";
    
    /**
     * Lấy userId từ Kong headers
     */
    public String getUserId(HttpServletRequest request) {
        return request.getHeader(USER_ID_HEADER);
    }
    
    /**
     * Lấy username từ Kong headers
     */
    public String getUsername(HttpServletRequest request) {
        return request.getHeader(USERNAME_HEADER);
    }
    
    /**
     * Kiểm tra user đã được authenticate chưa
     */
    public boolean isAuthenticated(HttpServletRequest request) {
        String userId = getUserId(request);
        return userId != null && !userId.trim().isEmpty();
    }
    
    /**
     * Lấy user info dưới dạng object
     */
    public KongUserInfo getUserInfo(HttpServletRequest request) {
        return new KongUserInfo(
            getUserId(request),
            getUsername(request)
        );
    }
    
    /**
     * Data class chứa user info từ Kong
     */
    public static class KongUserInfo {
        private final String userId;
        private final String username;
        
        public KongUserInfo(String userId, String username) {
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
