package com.example.server.infrastructure.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisCacheService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    // Cache keys
    private static final String USER_CACHE_KEY = "user:";
    private static final String CONVERSATION_CACHE_KEY = "conversation:";
    private static final String FRIEND_CACHE_KEY = "friend:";
    private static final String ONLINE_USERS_KEY = "online_users";
    private static final String TYPING_KEY = "typing:";
    
    // Cache operations
    public void cacheUser(String userId, Object userData, Duration ttl) {
        String key = USER_CACHE_KEY + userId;
        redisTemplate.opsForValue().set(key, userData, ttl);
        log.debug("Cached user data for userId: {}", userId);
    }
    
    public Object getCachedUser(String userId) {
        String key = USER_CACHE_KEY + userId;
        return redisTemplate.opsForValue().get(key);
    }
    
    public void evictUser(String userId) {
        String key = USER_CACHE_KEY + userId;
        redisTemplate.delete(key);
        log.debug("Evicted user cache for userId: {}", userId);
    }
    
    public void cacheConversation(String conversationId, Object conversationData, Duration ttl) {
        String key = CONVERSATION_CACHE_KEY + conversationId;
        redisTemplate.opsForValue().set(key, conversationData, ttl);
        log.debug("Cached conversation data for conversationId: {}", conversationId);
    }
    
    public Object getCachedConversation(String conversationId) {
        String key = CONVERSATION_CACHE_KEY + conversationId;
        return redisTemplate.opsForValue().get(key);
    }
    
    public void evictConversation(String conversationId) {
        String key = CONVERSATION_CACHE_KEY + conversationId;
        redisTemplate.delete(key);
        log.debug("Evicted conversation cache for conversationId: {}", conversationId);
    }
    
    // Online status management
    public void setUserOnline(String userId) {
        redisTemplate.opsForSet().add(ONLINE_USERS_KEY, userId);
        log.debug("User {} is now online", userId);
    }
    
    public void setUserOffline(String userId) {
        redisTemplate.opsForSet().remove(ONLINE_USERS_KEY, userId);
        log.debug("User {} is now offline", userId);
    }
    
    public boolean isUserOnline(String userId) {
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, userId));
    }
    
    public Set<Object> getOnlineUsers() {
        return redisTemplate.opsForSet().members(ONLINE_USERS_KEY);
    }
    
    // Typing indicators
    public void setTyping(String conversationId, String userId, boolean isTyping) {
        String key = TYPING_KEY + conversationId;
        if (isTyping) {
            redisTemplate.opsForSet().add(key, userId);
            redisTemplate.expire(key, Duration.ofSeconds(10)); // Auto-expire after 10 seconds
        } else {
            redisTemplate.opsForSet().remove(key, userId);
        }
        log.debug("User {} {} typing in conversation {}", userId, isTyping ? "started" : "stopped", conversationId);
    }
    
    public Set<Object> getTypingUsers(String conversationId) {
        String key = TYPING_KEY + conversationId;
        return redisTemplate.opsForSet().members(key);
    }
    
    // Generic cache operations
    public void set(String key, Object value, Duration ttl) {
        redisTemplate.opsForValue().set(key, value, ttl);
    }
    
    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }
    
    public void delete(String key) {
        redisTemplate.delete(key);
    }
    
    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}


