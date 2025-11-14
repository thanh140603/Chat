package com.example.websocket.kafka;

import com.example.websocket.ws.ChatWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserEventConsumer {

    private final ChatWebSocketHandler webSocketHandler;
    private final StringRedisTemplate stringRedisTemplate;

    public UserEventConsumer(ChatWebSocketHandler webSocketHandler,
                             StringRedisTemplate stringRedisTemplate) {
        this.webSocketHandler = webSocketHandler;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    /**
     * Handle user events from Kafka: online/offline, friend requests, call events
     */
    @KafkaListener(topics = "${app.kafka.topics.user}")
    public void onUserEvent(ConsumerRecord<String, String> record,
                            @Header(name = "messageId", required = false) String messageIdHeader) {
        String payload = record.value();
        String eventType = extractField(payload, "eventType");
        String userId = extractField(payload, "id");

        String messageId = messageIdHeader != null ? messageIdHeader : extractField(payload, "messageId");
        if (messageId != null && !messageId.isEmpty()) {
            String key = "processed:" + messageId;
            Boolean first = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", java.time.Duration.ofDays(1));
            if (Boolean.FALSE.equals(first)) {
                return;
            }
        }
        
        if (userId != null) {
            switch (eventType) {
                case "USER_ONLINE":
                    handleUserOnline(userId, payload);
                    break;
                case "USER_OFFLINE":
                    handleUserOffline(userId, payload);
                    break;
                case "FRIEND_REQUEST":
                    handleFriendRequest(userId, payload);
                    break;
                case "FRIEND_REQUEST_ACCEPTED":
                    handleFriendRequestAccepted(userId, payload);
                    break;
                case "CALL_INITIATED":
                case "CALL_ANSWERED":
                case "CALL_REJECTED":
                case "CALL_ENDED":
                case "CALL_MISSED":
                    handleCallEvent(userId, payload);
                    break;
                default:
                    log.warn("Unknown user event type: {}", eventType);
            }
        }
    }
    
    /**
     * Handle user online event
     */
    private void handleUserOnline(String userId, String payload) {
        webSocketHandler.broadcastToUser(userId, payload);
        log.info("User {} is now online", userId);
    }
    
    /**
     * Handle user offline event
     */
    private void handleUserOffline(String userId, String payload) {
        webSocketHandler.broadcastToUser(userId, payload);
        log.info("User {} is now offline", userId);
    }
    
    /**
     * Handle friend request event
     */
    private void handleFriendRequest(String userId, String payload) {
        webSocketHandler.broadcastToUser(userId, payload);
        log.info("Friend request sent to user {}", userId);
    }
    
    /**
     * Handle friend request accepted event
     */
    private void handleFriendRequestAccepted(String userId, String payload) {
        webSocketHandler.broadcastToUser(userId, payload);
        log.info("Friend request accepted for user {}", userId);
    }
    
    /**
     * Handle call events (initiated, answered, rejected, ended, missed)
     */
    private void handleCallEvent(String userId, String payload) {
        webSocketHandler.broadcastToUser(userId, payload);
        log.info("Call event sent to user {}", userId);
    }

    /**
     * Extract field from JSON string
     */
    private String extractField(String json, String key) {
        String pattern = "\"" + key + "\":\"";
        int start = json.indexOf(pattern);
        if (start < 0) return null;
        start += pattern.length();
        int end = json.indexOf('"', start);
        if (end < 0) return null;
        return json.substring(start, end);
    }
}
