package com.example.websocket.presence;

import com.example.websocket.friend.FriendApiClient;
import com.example.websocket.friend.FriendApiClient.FriendInfo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PresenceService {

    private static final Logger log = LoggerFactory.getLogger(PresenceService.class);

    private static final String SESSION_KEY_PREFIX = "presence:sessions:";
    private static final String FRIENDS_KEY_PREFIX = "presence:friends:";
    private static final String LAST_SEEN_KEY_PREFIX = "presence:lastSeen:";
    private static final String STATUS_KEY_PREFIX = "presence:status:";

    private final FriendApiClient friendApiClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private final TypeReference<List<FriendInfo>> friendListType = new TypeReference<>() {};

    public PresenceService(FriendApiClient friendApiClient,
                           StringRedisTemplate redisTemplate,
                           ObjectMapper objectMapper) {
        this.friendApiClient = friendApiClient;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public PresenceOnlineResult handleUserOnline(String userId, String username, String accessToken) {
        Long sessionCount = redisTemplate.opsForValue().increment(sessionKey(userId));
        redisTemplate.expire(sessionKey(userId), Duration.ofHours(12));
        redisTemplate.opsForValue().set(statusKey(userId), "online", Duration.ofHours(12));

        List<FriendInfo> friends = friendApiClient.getFriends(accessToken);
        log.info("Fetched {} friends for user {}", friends.size(), userId);
        cacheFriendList(userId, friends);

        List<String> friendIds = friends.stream().map(FriendInfo::id).filter(Objects::nonNull).collect(Collectors.toList());
        List<PresenceMessage> messages = new ArrayList<>();

        long timestamp = System.currentTimeMillis();
        
        // Always notify all friends when user comes online (not just first session)
        // This ensures synchronization when friends connect later
        for (FriendInfo friend : friends) {
            if (friend.id() == null) continue;
            String payload = buildPresenceEvent(
                    "online",
                    userId,
                    username,
                    friend.id(),
                    timestamp,
                    null
            );
            messages.add(new PresenceMessage(friend.id(), payload));
        }
        
        // Always send PRESENCE_SYNC to the connecting user with all their friends' status
        String syncPayload = buildPresenceSync(userId, friends);
        messages.add(new PresenceMessage(userId, syncPayload));

        return new PresenceOnlineResult(friendIds, messages);
    }

    public List<PresenceMessage> handleUserOffline(String userId, String username, List<String> cachedFriendIds) {
        Long sessionsLeft = redisTemplate.opsForValue().decrement(sessionKey(userId));
        if (sessionsLeft != null && sessionsLeft > 0) {
            // still have active sessions
            redisTemplate.opsForValue().set(sessionKey(userId), sessionsLeft.toString(), Duration.ofHours(12));
            return Collections.emptyList();
        }

        redisTemplate.delete(sessionKey(userId));
        long timestamp = System.currentTimeMillis();
        redisTemplate.opsForValue().set(lastSeenKey(userId), String.valueOf(timestamp), Duration.ofDays(7));
        redisTemplate.opsForValue().set(statusKey(userId), "offline", Duration.ofHours(12));

        List<FriendInfo> friends = loadFriendList(userId);
        log.info("Loaded cached friend list for user {} - {} friends", userId, friends.size());
        if (friends.isEmpty() && cachedFriendIds != null) {
            friends = cachedFriendIds.stream()
                    .map(id -> new FriendInfo(id, null, null, null))
                    .collect(Collectors.toList());
        }

        List<PresenceMessage> messages = new ArrayList<>();
        for (FriendInfo friend : friends) {
            if (friend.id() == null) continue;
            String payload = buildPresenceEvent(
                    "offline",
                    userId,
                    username,
                    friend.id(),
                    timestamp,
                    timestamp
            );
            messages.add(new PresenceMessage(friend.id(), payload));
        }
        return messages;
    }

    private String buildPresenceEvent(String status,
                                      String userId,
                                      String username,
                                      String targetUserId,
                                      long timestamp,
                                      Long lastSeen) {
        try {
            java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
            payload.put("type", "presence");
            payload.put("status", status);
            payload.put("userId", userId);
            payload.put("username", username);
            payload.put("targetUserId", targetUserId);
            payload.put("timestamp", timestamp);
            if (lastSeen != null) {
                payload.put("lastSeen", lastSeen);
            }
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to build presence payload", ex);
        }
    }

    private String buildPresenceSync(String userId, List<FriendInfo> friends) {
        try {
            List<Map<String, Object>> friendStatuses = new ArrayList<>();
            for (FriendInfo friend : friends) {
                if (friend.id() == null) continue;
                boolean online = isOnline(friend.id());
                Long lastSeen = getLastSeen(friend.id());
                log.info("Building presence sync for user {}: friend {} is {}", userId, friend.id(), online ? "online" : "offline");
                java.util.Map<String, Object> info = new java.util.LinkedHashMap<>();
                info.put("userId", friend.id());
                info.put("status", online ? "online" : "offline");
                if (lastSeen != null) {
                    info.put("lastSeen", lastSeen);
                }
                friendStatuses.add(info);
            }

            java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
            payload.put("type", "presence_sync");
            payload.put("targetUserId", userId);
            payload.put("friends", friendStatuses);
            payload.put("timestamp", System.currentTimeMillis());
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to build presence sync payload", ex);
        }
    }

    private boolean isOnline(String userId) {
        // First check session count - this is the most reliable indicator
        String sessionValue = redisTemplate.opsForValue().get(sessionKey(userId));
        if (sessionValue == null || sessionValue.isBlank()) {
            log.info("User {} has no session key in Redis (null or blank) - considered offline", userId);
            return false;
        }
        try {
            long sessionCount = Long.parseLong(sessionValue.trim());
            if (sessionCount > 0) {
                log.info("User {} has session count {} - considered online", userId, sessionCount);
                return true;
            }
            // Session count is 0 or negative - user is offline
            log.info("User {} has session count {} (<=0) - considered offline", userId, sessionCount);
            return false;
        } catch (NumberFormatException ex) {
            log.warn("Invalid session count value for user {}: '{}' - checking status key as fallback", userId, sessionValue);
            // If session count is invalid, check status key as fallback
            String status = redisTemplate.opsForValue().get(statusKey(userId));
            boolean isOnlineFromStatus = "online".equals(status);
            log.info("User {} status key: '{}' - considered {}", userId, status, isOnlineFromStatus ? "online" : "offline");
            return isOnlineFromStatus;
        }
    }

    private Long getLastSeen(String userId) {
        String value = redisTemplate.opsForValue().get(lastSeenKey(userId));
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void cacheFriendList(String userId, List<FriendInfo> friends) {
        try {
            if (friends == null || friends.isEmpty()) {
                redisTemplate.delete(friendsKey(userId));
                return;
            }
            String json = objectMapper.writeValueAsString(friends);
            redisTemplate.opsForValue().set(friendsKey(userId), json, Duration.ofHours(6));
        } catch (Exception ex) {
            log.warn("Failed to cache friend list for user {}", userId, ex);
        }
    }

    private List<FriendInfo> loadFriendList(String userId) {
        try {
            String json = redisTemplate.opsForValue().get(friendsKey(userId));
            if (json == null || json.isBlank()) {
                return Collections.emptyList();
            }
            return objectMapper.readValue(json, friendListType);
        } catch (Exception ex) {
            log.warn("Failed to load cached friend list for user {}", userId, ex);
            return Collections.emptyList();
        }
    }

    private String sessionKey(String userId) {
        return SESSION_KEY_PREFIX + userId;
    }

    private String friendsKey(String userId) {
        return FRIENDS_KEY_PREFIX + userId;
    }

    private String lastSeenKey(String userId) {
        return LAST_SEEN_KEY_PREFIX + userId;
    }

    private String statusKey(String userId) {
        return STATUS_KEY_PREFIX + userId;
    }

    public record PresenceMessage(String targetUserId, String payload) {}

    public record PresenceOnlineResult(List<String> friendIds, List<PresenceMessage> messages) {}
}


