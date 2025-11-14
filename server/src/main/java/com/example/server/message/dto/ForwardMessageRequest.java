package com.example.server.message.dto;

import java.util.List;

public class ForwardMessageRequest {
    private List<String> messageIds; // IDs of messages to forward
    private String targetConversationId; // Destination conversation
    private String comment; // Optional comment when forwarding

    public List<String> getMessageIds() { return messageIds; }
    public void setMessageIds(List<String> messageIds) { this.messageIds = messageIds; }

    public String getTargetConversationId() { return targetConversationId; }
    public void setTargetConversationId(String targetConversationId) { this.targetConversationId = targetConversationId; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}

