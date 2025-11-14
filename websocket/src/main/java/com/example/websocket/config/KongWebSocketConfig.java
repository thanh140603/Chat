package com.example.websocket.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.example.websocket.ws.ChatWebSocketHandler;
import com.example.websocket.security.KongHandshakeInterceptor;

/**
 * WebSocket configuration for Kong Gateway mode
 * Kong handles JWT authentication, so we can simplify the interceptor
 */
@Configuration
@EnableWebSocket
public class KongWebSocketConfig implements WebSocketConfigurer {

    private static final Logger log = LoggerFactory.getLogger(KongWebSocketConfig.class);

    private final ChatWebSocketHandler chatWebSocketHandler;
    private final KongHandshakeInterceptor kongHandshakeInterceptor;

    public KongWebSocketConfig(ChatWebSocketHandler chatWebSocketHandler, 
                              KongHandshakeInterceptor kongHandshakeInterceptor) {
        this.chatWebSocketHandler = chatWebSocketHandler;
        this.kongHandshakeInterceptor = kongHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        log.info("Registering WebSocket handlers for Kong profile");
        registry.addHandler(chatWebSocketHandler, "/ws", "/ws-message")
                .addInterceptors(kongHandshakeInterceptor)
                .setAllowedOrigins("*");
    }
}
