package com.example.websocket.security;

import org.springframework.context.annotation.Profile;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Interceptor for WebSocket handshake: extract user info from Kong Gateway headers
 */
@Component
@Profile("kong")
public class KongHandshakeInterceptor implements HandshakeInterceptor {

    private final KongWebSocketUserExtractor userExtractor;

    public KongHandshakeInterceptor(KongWebSocketUserExtractor userExtractor) {
        this.userExtractor = userExtractor;
    }

    /**
     * Check authentication before handshake: only accept requests through Kong Gateway
     */
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            if (userExtractor.isAuthenticated(request)) {
                userExtractor.addUserInfoToAttributes(request, attributes);
                return true;
            }
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }
}
