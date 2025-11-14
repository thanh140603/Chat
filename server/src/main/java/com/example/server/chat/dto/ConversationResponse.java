package com.example.server.chat.dto;

import java.time.Instant;
import java.util.List;

public class ConversationResponse {
    private String id;
    private String type; // "DIRECT" or "GROUP"
    private String name; // Group name or other user's display name
    private String avatarUrl; // Group avatar or other user's avatar
    private List<ParticipantResponse> participants;
    private String lastMessageContent;
    private Instant lastMessageCreatedAt;
    private String lastMessageSenderId;
    private String lastMessageSenderName;
    private int unreadCount;
    private boolean isFavorite;
    private boolean isMuted;
    private String pinnedMessageId;
    private Instant pinnedAt;
    private String pinnedByUserId;
    private Instant createdAt;
    private Instant updatedAt;

    public ConversationResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public List<ParticipantResponse> getParticipants() { return participants; }
    public void setParticipants(List<ParticipantResponse> participants) { this.participants = participants; }
    public String getLastMessageContent() { return lastMessageContent; }
    public void setLastMessageContent(String lastMessageContent) { this.lastMessageContent = lastMessageContent; }
    public Instant getLastMessageCreatedAt() { return lastMessageCreatedAt; }
    public void setLastMessageCreatedAt(Instant lastMessageCreatedAt) { this.lastMessageCreatedAt = lastMessageCreatedAt; }
    public String getLastMessageSenderId() { return lastMessageSenderId; }
    public void setLastMessageSenderId(String lastMessageSenderId) { this.lastMessageSenderId = lastMessageSenderId; }
    public String getLastMessageSenderName() { return lastMessageSenderName; }
    public void setLastMessageSenderName(String lastMessageSenderName) { this.lastMessageSenderName = lastMessageSenderName; }
    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }
    public boolean isFavorite() { return isFavorite; }
    public void setFavorite(boolean favorite) { this.isFavorite = favorite; }
    public boolean isMuted() { return isMuted; }
    public void setMuted(boolean muted) { this.isMuted = muted; }
    public String getPinnedMessageId() { return pinnedMessageId; }
    public void setPinnedMessageId(String pinnedMessageId) { this.pinnedMessageId = pinnedMessageId; }
    public Instant getPinnedAt() { return pinnedAt; }
    public void setPinnedAt(Instant pinnedAt) { this.pinnedAt = pinnedAt; }
    public String getPinnedByUserId() { return pinnedByUserId; }
    public void setPinnedByUserId(String pinnedByUserId) { this.pinnedByUserId = pinnedByUserId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class ParticipantResponse {
        private String id;
        private String username;
        private String displayName;
        private String avatarUrl;
        private String role;
        private Instant joinedAt;
        private Instant lastSeenAt;
        private String lastReadMessageId; // ID of the last message that this participant has read

        public ParticipantResponse() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Instant getJoinedAt() { return joinedAt; }
        public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
        public Instant getLastSeenAt() { return lastSeenAt; }
        public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
        public String getLastReadMessageId() { return lastReadMessageId; }
        public void setLastReadMessageId(String lastReadMessageId) { this.lastReadMessageId = lastReadMessageId; }
    }
}


