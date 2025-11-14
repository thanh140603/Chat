package com.example.server.call.model;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import lombok.Data;
import java.time.Instant;

@Document(collection = "calls")
@Data
public class Call {
    @Id
    private String id;

    @Indexed
    private String conversationId; // DIRECT conversation ID

    @Indexed
    private String callerId; // User who initiated the call

    @Indexed
    private String receiverId; // User who receives the call

    private CallType type; // VOICE or VIDEO

    private CallStatus status; // INITIATED, ANSWERED, ENDED, etc.

    @CreatedDate
    private Instant startedAt; // When call was initiated

    private Instant answeredAt; // When call was answered (null if not answered)

    private Instant endedAt; // When call ended (null if still active)

    private String endedBy; // userId who ended the call (null if not ended)

    private Integer duration; // Duration in seconds (calculated when ended)
}

