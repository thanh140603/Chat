package com.example.server.outbox.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@Document(collection = "outbox")
public class OutboxEvent {
    @Id
    private String id;

    // Kafka message key for partitioning/idempotency at Kafka level
    @Indexed
    private String eventId;

    @Indexed
    private String type; // e.g., MESSAGE_SENT, USER_ONLINE

    @Indexed
    private String aggregateId; // conversationId or userId

    private Map<String, Object> payload;

    @Indexed
    private String status; // PENDING, SENT, FAILED

    private int attempt;

    @CreatedDate
    private Instant createdAt;

    private Instant lastAttemptAt;

    public static OutboxEvent messageEvent(String type, String conversationId, Map<String, Object> payload) {
        OutboxEvent e = new OutboxEvent();
        e.setType(type);
        e.setAggregateId(conversationId);
        e.setPayload(payload);
        e.setStatus("PENDING");
        e.setAttempt(0);
        return e;
    }
}


