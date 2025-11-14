package com.example.server.infrastructure.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@ConditionalOnBean(KafkaTemplate.class)
@Slf4j
public class KafkaEventPublisher {
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public KafkaEventPublisher(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    public void publishMessageEvent(String eventType, String conversationId, Map<String, Object> data) {
        try {
            String message = buildEventMessage(eventType, conversationId, data);
            kafkaTemplate.send("message.events", message);
            log.debug("Published message event: {} for conversation {}", eventType, conversationId);
        } catch (Exception e) {
            log.error("Failed to publish message event: {}", eventType, e);
        }
    }
    
    public void publishMessageEvent(String key, String eventType, String conversationId, Map<String, Object> data) {
        try {
            String message = buildEventMessage(eventType, conversationId, data);
            // Use ProducerRecord to include messageId header
            org.apache.kafka.clients.producer.ProducerRecord<String, String> record =
                new org.apache.kafka.clients.producer.ProducerRecord<>("message.events", null, key, message);
            Object msgId = data.get("messageId");
            if (msgId != null) {
                record.headers().add("messageId", msgId.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            kafkaTemplate.send(record);
            log.debug("Published message event with key {}: {} for conversation {}", key, eventType, conversationId);
        } catch (Exception e) {
            log.error("Failed to publish message event with key: {}", eventType, e);
        }
    }

    public void publishUserEvent(String eventType, String userId, Map<String, Object> data) {
        try {
            String message = buildEventMessage(eventType, userId, data);
            kafkaTemplate.send("user.events", message);
            log.debug("Published user event: {} for user {}", eventType, userId);
        } catch (Exception e) {
            log.error("Failed to publish user event: {}", eventType, e);
        }
    }

    public void publishUserEvent(String key, String eventType, String userId, Map<String, Object> data) {
        try {
            String message = buildEventMessage(eventType, userId, data);
            kafkaTemplate.send("user.events", key, message);
            log.debug("Published user event with key {}: {} for user {}", key, eventType, userId);
        } catch (Exception e) {
            log.error("Failed to publish user event with key: {}", eventType, e);
        }
    }
    
    private String buildEventMessage(String eventType, String id, Map<String, Object> data) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventType", eventType);
        payload.put("id", id);
        payload.put("timestamp", System.currentTimeMillis());
        payload.put("data", sanitizeData(data));

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize event payload", e);
        }
    }

    private Map<String, Object> sanitizeData(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();
        data.forEach((key, value) -> sanitized.put(key, normalizeValue(value)));
        return sanitized;
    }

    private Object normalizeValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value;
        }
        if (value instanceof Instant) {
            return value.toString();
        }
        if (value instanceof Map<?, ?> mapValue) {
            return mapValue.entrySet().stream()
                    .collect(Collectors.toMap(
                            e -> String.valueOf(e.getKey()),
                            e -> normalizeValue(e.getValue()),
                            (a, b) -> b,
                            LinkedHashMap::new
                    ));
        }
        if (value instanceof Iterable<?> iterable) {
            List<Object> normalized = new ArrayList<>();
            for (Object item : iterable) {
                normalized.add(normalizeValue(item));
            }
            return normalized;
        }
        if (value.getClass().isArray()) {
            int length = java.lang.reflect.Array.getLength(value);
            List<Object> normalized = new ArrayList<>(length);
            for (int i = 0; i < length; i++) {
                normalized.add(normalizeValue(java.lang.reflect.Array.get(value, i)));
            }
            return normalized;
        }
        return value.toString();
    }
}