package com.example.server.message.dto;

import java.time.Instant;

public class MessageResponse {
    private String id;
    private String senderId;
    private String conversationId;
    private String content;
    private String imageUrl;
    private Instant createdAt;
    private Instant originalCreatedAt;
    private Instant updatedAt;

    // Forwarding information
    private String forwardedFromMessageId;
    private String forwardedFromConversationId;
    private String forwardedFromSenderId;
    private String forwardedFromSenderName;
    private Instant forwardedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getOriginalCreatedAt() { return originalCreatedAt; }
    public void setOriginalCreatedAt(Instant originalCreatedAt) { this.originalCreatedAt = originalCreatedAt; }
    
    public String getForwardedFromMessageId() { return forwardedFromMessageId; }
    public void setForwardedFromMessageId(String forwardedFromMessageId) { this.forwardedFromMessageId = forwardedFromMessageId; }
    public String getForwardedFromConversationId() { return forwardedFromConversationId; }
    public void setForwardedFromConversationId(String forwardedFromConversationId) { this.forwardedFromConversationId = forwardedFromConversationId; }
    public String getForwardedFromSenderId() { return forwardedFromSenderId; }
    public void setForwardedFromSenderId(String forwardedFromSenderId) { this.forwardedFromSenderId = forwardedFromSenderId; }
    public String getForwardedFromSenderName() { return forwardedFromSenderName; }
    public void setForwardedFromSenderName(String forwardedFromSenderName) { this.forwardedFromSenderName = forwardedFromSenderName; }
    public Instant getForwardedAt() { return forwardedAt; }
    public void setForwardedAt(Instant forwardedAt) { this.forwardedAt = forwardedAt; }
}


