package com.example.websocket.ws;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.example.websocket.presence.PresenceService;
import com.example.websocket.presence.PresenceService.PresenceMessage;
import com.example.websocket.presence.PresenceService.PresenceOnlineResult;
import org.springframework.lang.NonNull;

@Component
@Slf4j
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, Set<WebSocketSession>> userIdToSessions = new ConcurrentHashMap<>();
    private final Map<String, Set<WebSocketSession>> conversationIdToSessions = new ConcurrentHashMap<>();
    private final PresenceService presenceService;

    public ChatWebSocketHandler(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    /**
     * Handle WebSocket connection established: save session and notify presence online
     */
    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        Object userId = session.getAttributes().get("userId");
        Object username = session.getAttributes().get("username");
        Object token = session.getAttributes().get("accessToken");
        if (userId != null) {
            userIdToSessions
                .computeIfAbsent(userId.toString(), k -> ConcurrentHashMap.newKeySet())
                .add(session);

            log.info("WebSocket connected for user {}. Active sessions: {}", userId,
                    userIdToSessions.getOrDefault(userId.toString(), java.util.Collections.emptySet()).size());

            try {
                PresenceOnlineResult result = presenceService.handleUserOnline(
                        userId.toString(),
                        username != null ? username.toString() : userId.toString(),
                        token != null ? token.toString() : null
                );
                if (result != null) {
                    log.info("Presence online processed for user {}. Notifying {} friends", userId,
                            result.messages() != null ? result.messages().size() : 0);
                    if (result.friendIds() != null) {
                        session.getAttributes().put("friendIds", new java.util.ArrayList<>(result.friendIds()));
                    }
                    if (result.messages() != null) {
                        for (PresenceMessage message : result.messages()) {
                            if (message.targetUserId().equals(userId.toString()) && session.isOpen()) {
                                try {
                                    session.sendMessage(new org.springframework.web.socket.TextMessage(message.payload()));
                                    log.info("Sent PRESENCE_SYNC to user {} on connection. Payload: {}", userId, message.payload());
                                } catch (Exception ex) {
                                    log.warn("Failed to send PRESENCE_SYNC to user {} on connection", userId, ex);
                                }
                            } else {
                                broadcastToUser(message.targetUserId(), message.payload());
                            }
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("Failed to process online presence for user {}", userId, ex);
            }
        }
    }

    /**
     * Handle text messages from client: join conversation, typing indicators, and WebRTC signaling
     */
    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
        String payload = message.getPayload();
        Object userId = session.getAttributes().get("userId");
        
        if (payload.contains("\"type\":\"join\"")) {
            String conversationId = extractField(payload, "conversationId");
            if (conversationId != null && !conversationId.isBlank()) {
                conversationIdToSessions
                        .computeIfAbsent(conversationId, k -> ConcurrentHashMap.newKeySet())
                        .add(session);

                @SuppressWarnings("unchecked")
                Set<String> conversations = (Set<String>) session.getAttributes()
                        .computeIfAbsent("conversations", k -> ConcurrentHashMap.newKeySet());
                conversations.add(conversationId);

                Object sessionUserId = session.getAttributes().get("userId");
                Object sessionUsername = session.getAttributes().get("username");
                if (sessionUserId != null) {
                    notifyConversationsPresence(Collections.singleton(conversationId),
                            sessionUserId.toString(),
                            sessionUsername != null ? sessionUsername.toString() : sessionUserId.toString(),
                            true);
                }
            }
        } else if (payload.contains("\"type\":\"typing_start\"")) {
            String conversationId = extractField(payload, "conversationId");
            if (conversationId != null && userId != null) {
                handleTyping(conversationId, userId.toString(), true);
            }
        } else if (payload.contains("\"type\":\"typing_stop\"")) {
            String conversationId = extractField(payload, "conversationId");
            if (conversationId != null && userId != null) {
                handleTyping(conversationId, userId.toString(), false);
            }
        } else if (payload.contains("\"type\":\"call_offer\"")) {
            handleCallOffer(payload, userId != null ? userId.toString() : null);
        } else if (payload.contains("\"type\":\"call_answer\"")) {
            handleCallAnswer(payload, userId != null ? userId.toString() : null);
        } else if (payload.contains("\"type\":\"call_ice_candidate\"")) {
            handleCallIceCandidate(payload, userId != null ? userId.toString() : null);
        }
    }

    /**
     * Handle WebSocket connection closed: remove session and notify presence offline
     */
    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) throws Exception {
        Object userId = session.getAttributes().get("userId");
        Object username = session.getAttributes().get("username");
        if (userId != null) {
            Set<WebSocketSession> sessions = userIdToSessions.get(userId.toString());
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userIdToSessions.remove(userId.toString());
                }
            }

            log.info("WebSocket disconnected for user {}. Remaining sessions: {}", userId,
                    userIdToSessions.getOrDefault(userId.toString(), java.util.Collections.emptySet()).size());

            try {
                @SuppressWarnings("unchecked")
                java.util.List<String> friendIds = (java.util.List<String>) session.getAttributes().get("friendIds");
                java.util.List<PresenceMessage> messages = presenceService.handleUserOffline(
                        userId.toString(),
                        username != null ? username.toString() : userId.toString(),
                        friendIds
                );
                if (messages != null) {
                    log.info("Presence offline processed for user {}. Notifying {} friends", userId, messages.size());
                    for (PresenceMessage message : messages) {
                        broadcastToUser(message.targetUserId(), message.payload());
                    }
                }

                @SuppressWarnings("unchecked")
                Set<String> conversations = (Set<String>) session.getAttributes().get("conversations");
                if (conversations != null && !conversations.isEmpty()) {
                    notifyConversationsPresence(conversations, userId.toString(),
                            username != null ? username.toString() : userId.toString(), false);
                }
            } catch (Exception ex) {
                log.warn("Failed to process offline presence for user {}", userId, ex);
            }
        }
        conversationIdToSessions.values().forEach(set -> set.remove(session));
    }

    /**
     * Send message to all sessions in a conversation
     */
    public void broadcastToConversation(String conversationId, String jsonMessage) {
        Set<WebSocketSession> sessions = conversationIdToSessions.get(conversationId);
        if (sessions == null) return;
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(jsonMessage));
                } catch (Exception ignored) {}
            }
        }
    }

    /**
     * Notify user online/offline status to participants in conversations
     */
    private void notifyConversationsPresence(Set<String> conversationIds, String userId, String username, boolean isOnline) {
        long timestamp = System.currentTimeMillis();
        String status = isOnline ? "online" : "offline";
        String payload = String.format(
                "{\"type\":\"presence\",\"status\":\"%s\",\"userId\":\"%s\",\"username\":\"%s\",\"timestamp\":%d}",
                status, userId, username, timestamp
        );

        for (String conversationId : conversationIds) {
            Set<WebSocketSession> sessions = conversationIdToSessions.get(conversationId);
            if (sessions == null) continue;
            for (WebSocketSession session : sessions) {
                Object targetUserId = session.getAttributes().get("userId");
                if (targetUserId == null || targetUserId.toString().equals(userId)) continue;
                try {
                    session.sendMessage(new TextMessage(
                            payload.substring(0, payload.length() - 1) +
                                    ",\"targetUserId\":\"" + targetUserId + "\"}"));
                } catch (Exception ex) {
                    log.warn("Failed to send presence {} notification to user {}", status, targetUserId, ex);
                }
            }
        }
    }
    
    /**
     * Handle typing indicator: send typing notification to other participants in conversation
     */
    private void handleTyping(String conversationId, String userId, boolean isTyping) {
        String message = String.format(
                "{\"type\":\"typing\",\"conversationId\":\"%s\",\"userId\":\"%s\",\"isTyping\":%s,\"timestamp\":%d}",
                conversationId,
                userId,
                isTyping,
                System.currentTimeMillis()
        );

        Set<WebSocketSession> sessions = conversationIdToSessions.get(conversationId);
        if (sessions != null) {
            for (WebSocketSession session : sessions) {
                Object sessionUserId = session.getAttributes().get("userId");
                if (sessionUserId != null && !sessionUserId.toString().equals(userId) && session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(message));
                    } catch (Exception ignored) {}
                }
            }
        }
    }
    
    /**
     * Send message to all sessions of a user
     */
    public void broadcastToUser(String userId, String message) {
        Set<WebSocketSession> sessions = userIdToSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        for (WebSocketSession session : sessions) {
            if (session == null || !session.isOpen()) continue;
            try {
                session.sendMessage(new TextMessage(message));
            } catch (Exception e) {
                log.warn("Failed to send message to user {}", userId, e);
            }
        }
    }
    
    /**
     * Extract field value from JSON string
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
    
    /**
     * Handle WebRTC offer: relay offer from caller to receiver
     */
    private void handleCallOffer(String payload, String senderUserId) {
        if (senderUserId == null) {
            log.warn("Call offer received without userId");
            return;
        }
        
        try {
            log.info("Call offer received from user {}: {}", senderUserId, payload);
            String callId = extractField(payload, "callId");
            String targetUserId = extractField(payload, "targetUserId");
            
            log.info("Extracted callId={}, targetUserId={} from offer", callId, targetUserId);
            
            if (callId == null || targetUserId == null) {
                log.warn("Call offer missing callId or targetUserId. callId={}, targetUserId={}, payload={}", 
                        callId, targetUserId, payload);
                return;
            }
            
            broadcastToUser(targetUserId, payload);
            log.info("Call offer relayed: callId={}, from={}, to={}", callId, senderUserId, targetUserId);
        } catch (Exception e) {
            log.error("Failed to handle call offer", e);
        }
    }
    
    /**
     * Handle WebRTC answer: relay answer from receiver to caller
     */
    private void handleCallAnswer(String payload, String senderUserId) {
        if (senderUserId == null) {
            log.warn("Call answer received without userId");
            return;
        }
        
        try {
            String callId = extractField(payload, "callId");
            String targetUserId = extractField(payload, "targetUserId");
            
            if (callId == null || targetUserId == null) {
                log.warn("Call answer missing callId or targetUserId: {}", payload);
                return;
            }
            
            broadcastToUser(targetUserId, payload);
            log.info("Call answer relayed: callId={}, from={}, to={}", callId, senderUserId, targetUserId);
        } catch (Exception e) {
            log.error("Failed to handle call answer", e);
        }
    }
    
    /**
     * Handle WebRTC ICE candidate: relay ICE candidate between peers
     */
    private void handleCallIceCandidate(String payload, String senderUserId) {
        if (senderUserId == null) {
            log.warn("Call ICE candidate received without userId");
            return;
        }
        
        try {
            String callId = extractField(payload, "callId");
            String targetUserId = extractField(payload, "targetUserId");
            
            if (callId == null || targetUserId == null) {
                log.warn("Call ICE candidate missing callId or targetUserId: {}", payload);
                return;
            }
            
            broadcastToUser(targetUserId, payload);
            log.debug("Call ICE candidate relayed: callId={}, from={}, to={}", callId, senderUserId, targetUserId);
        } catch (Exception e) {
            log.error("Failed to handle call ICE candidate", e);
        }
    }
}


