package com.example.server.message.dto;

public class MessageRequest {
    private String messageId; // optional idempotency key from client
    private String recipientId; // for direct (optional if conversationId provided)
    private String conversationId; // required for group; optional for direct
    private String content;
    private String imgUrl;

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImgUrl() { return imgUrl; }
    public void setImgUrl(String imgUrl) { this.imgUrl = imgUrl; }
}


