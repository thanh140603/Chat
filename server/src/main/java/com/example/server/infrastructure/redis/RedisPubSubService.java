package com.example.server.infrastructure.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisPubSubService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisMessageListenerContainer messageListenerContainer;
    
    // Channel topics
    private static final String USER_STATUS_CHANNEL = "user_status";
    private static final String TYPING_CHANNEL = "typing";
    private static final String MESSAGE_SEEN_CHANNEL = "message_seen";
    
    // Publish user status changes
    public void publishUserStatus(String userId, String status) {
        Map<String, Object> message = Map.of(
            "userId", userId,
            "status", status,
            "timestamp", System.currentTimeMillis()
        );
        
        redisTemplate.convertAndSend(USER_STATUS_CHANNEL, message);
        log.debug("Published user status: {} for user {}", status, userId);
    }
    
    // Publish typing indicators
    public void publishTypingIndicator(String conversationId, String userId, boolean isTyping) {
        Map<String, Object> message = Map.of(
            "conversationId", conversationId,
            "userId", userId,
            "isTyping", isTyping,
            "timestamp", System.currentTimeMillis()
        );
        
        redisTemplate.convertAndSend(TYPING_CHANNEL, message);
        log.debug("Published typing indicator: {} for user {} in conversation {}", isTyping, userId, conversationId);
    }
    
    // Publish message seen events
    public void publishMessageSeen(String conversationId, String userId, String messageId) {
        Map<String, Object> message = Map.of(
            "conversationId", conversationId,
            "userId", userId,
            "messageId", messageId,
            "timestamp", System.currentTimeMillis()
        );
        
        redisTemplate.convertAndSend(MESSAGE_SEEN_CHANNEL, message);
        log.debug("Published message seen: message {} seen by user {} in conversation {}", messageId, userId, conversationId);
    }
    
    // Subscribe to channels
    public void subscribeToUserStatus(MessageListenerAdapter listenerAdapter) {
        messageListenerContainer.addMessageListener(listenerAdapter, new ChannelTopic(USER_STATUS_CHANNEL));
    }
    
    public void subscribeToTyping(MessageListenerAdapter listenerAdapter) {
        messageListenerContainer.addMessageListener(listenerAdapter, new ChannelTopic(TYPING_CHANNEL));
    }
    
    public void subscribeToMessageSeen(MessageListenerAdapter listenerAdapter) {
        messageListenerContainer.addMessageListener(listenerAdapter, new ChannelTopic(MESSAGE_SEEN_CHANNEL));
    }
}


