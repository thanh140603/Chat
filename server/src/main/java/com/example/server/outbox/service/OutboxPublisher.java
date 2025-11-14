package com.example.server.outbox.service;

import com.example.server.infrastructure.kafka.KafkaEventPublisher;
import com.example.server.outbox.model.OutboxEvent;
import com.example.server.outbox.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaEventPublisher kafkaEventPublisher;

    // Run every 500ms for better real-time performance; small batches to reduce pressure
    @Scheduled(fixedDelayString = "500")
    public void publishPending() {
        List<OutboxEvent> batch = outboxEventRepository.findTop100ByStatusOrderByCreatedAtAsc("PENDING");
        for (OutboxEvent event : batch) {
            try {
                if ("MESSAGE_SENT".equals(event.getType())) {
                    String key = event.getEventId() != null ? event.getEventId() : event.getAggregateId();
                    kafkaEventPublisher.publishMessageEvent(key, event.getType(), event.getAggregateId(), event.getPayload());
                } else if (event.getType() != null && event.getType().startsWith("USER_")) {
                    String key = event.getEventId() != null ? event.getEventId() : event.getAggregateId();
                    kafkaEventPublisher.publishUserEvent(key, event.getType(), event.getAggregateId(), event.getPayload());
                } else {
                    // default route to message topic
                    String key = event.getEventId() != null ? event.getEventId() : event.getAggregateId();
                    kafkaEventPublisher.publishMessageEvent(key, event.getType(), event.getAggregateId(), event.getPayload());
                }
                event.setStatus("SENT");
            } catch (Exception ex) {
                log.warn("Failed to publish outbox event {} type {}", event.getId(), event.getType(), ex);
                event.setAttempt(event.getAttempt() + 1);
                event.setLastAttemptAt(Instant.now());
                // Keep as PENDING; optional: move to FAILED after N attempts
            }
        }
        if (!batch.isEmpty()) {
            outboxEventRepository.saveAll(batch);
        }
    }
}


