package com.example.server.message.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import org.springframework.data.mongodb.core.index.IndexDirection;

@Getter
@Setter
@Document(collection = "messages")
@CompoundIndexes({
        @CompoundIndex(name = "conv_created_idx", def = "{ 'conversationId': 1, 'createdAt': 1 }")
})
public class Message {
    @Id
    private String id;

    @Indexed
    private String senderId;

    @Indexed
    private String conversationId;

    private String content;
    private String imageUrl;

    // Optional idempotency key supplied by client or generated server-side
    // Sparse so that null values don't violate uniqueness
    @Indexed(unique = true, sparse = true, direction = IndexDirection.ASCENDING)
    private String messageId;

    @CreatedDate
    private Instant createdAt;
    
    // Original creation time (never changes, used to determine if message was edited)
    private Instant originalCreatedAt;

    // Only set when message is actually edited (not using @LastModifiedDate to avoid auto-update on save)
    private Instant updatedAt;
    
    // Forwarding information
    private String forwardedFromMessageId; // Original message ID if this is a forwarded message
    private String forwardedFromConversationId; // Original conversation ID
    private String forwardedFromSenderId; // Original sender ID
    private String forwardedFromSenderName; // Original sender name (for display)
    private Instant forwardedAt; // When this message was forwarded
}


