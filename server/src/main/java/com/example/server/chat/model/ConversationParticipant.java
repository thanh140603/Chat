package com.example.server.chat.model;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.Instant;

@Document(collection = "participants")
@CompoundIndexes({
        @CompoundIndex(name = "conv_user_unique", def = "{ 'conversationId': 1, 'userId': 1 }", unique = true),
        @CompoundIndex(name = "user_active_idx", def = "{ 'userId': 1, 'isActive': 1 }"),
        @CompoundIndex(name = "conv_active_idx", def = "{ 'conversationId': 1, 'isActive': 1 }")
})
public class ConversationParticipant {
    @Id
    private String id;

    @Indexed
    private String conversationId;

    @Indexed
    private String userId;

    private Instant joinedAt;
    private ParticipantRole role;
    private boolean isActive = true;
    private Instant lastSeenAt;
    private long unreadCount;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}


