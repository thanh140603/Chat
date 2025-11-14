package com.example.server.chat.model;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import lombok.Data;
import java.time.Instant;

@Document(collection = "conversations")
@Data
public class Conversation {
    @Id
    private String id;

    @Indexed
    private ConversationType type;

    // Group info (only for GROUP)
    private String groupName;
    private String groupCreatedByUserId;
    private String groupAvatarUrl;

    // Last message snapshot for fast listing
    private String lastMessageContent;

    @Indexed
    private Instant lastMessageCreatedAt;

    private String lastMessageSenderId;
    
    // Pinned message
    private String pinnedMessageId; // ID of the pinned message
    private Instant pinnedAt; // When the message was pinned
    private String pinnedByUserId; // Who pinned the message

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}


