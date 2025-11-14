package com.example.server.infrastructure.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@ConditionalOnMissingBean(KafkaEventPublisher.class)
@Slf4j
public class NoOpKafkaEventPublisher {
    
    public void publishMessageEvent(String eventType, String conversationId, Map<String, Object> data) {
        log.debug("Kafka not available, skipping message event: {} for conversation {}", eventType, conversationId);
    }
    
    public void publishUserEvent(String eventType, String userId, Map<String, Object> data) {
        log.debug("Kafka not available, skipping user event: {} for user {}", eventType, userId);
    }
}
