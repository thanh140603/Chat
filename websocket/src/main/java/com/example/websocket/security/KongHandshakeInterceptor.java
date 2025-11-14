package com.example.websocket.security;

import org.springframework.context.annotation.Profile;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Simplified handshake interceptor for Kong Gateway mode
 * Kong handles JWT validation, so we just extract user info from headers
 */
@Component
@Profile("kong")
public class KongHandshakeInterceptor implements HandshakeInterceptor {

    private final KongWebSocketUserExtractor userExtractor;

    public KongHandshakeInterceptor(KongWebSocketUserExtractor userExtractor) {
        this.userExtractor = userExtractor;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            // Kong đã verify JWT và thêm user info vào headers
            if (userExtractor.isAuthenticated(request)) {
                userExtractor.addUserInfoToAttributes(request, attributes);
                return true;
            }
            
            // Không có fallback - chỉ accept requests qua Kong Gateway
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}
