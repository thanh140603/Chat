package com.example.websocket.kafka;

import com.example.websocket.ws.ChatWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MessageEventConsumer {

    private final ChatWebSocketHandler webSocketHandler;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MessageEventConsumer(ChatWebSocketHandler webSocketHandler,
                                StringRedisTemplate stringRedisTemplate) {
        this.webSocketHandler = webSocketHandler;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    // Expect event payload contains conversationId and content fields
    @KafkaListener(topics = "${app.kafka.topics.message}")
    public void onMessageEvent(ConsumerRecord<String, String> record,
                               @Header(name = "messageId", required = false) String messageIdHeader) {
        String payload = record.value();

        try {
            JsonNode root = objectMapper.readTree(payload);
            String eventType = getText(root, "eventType");
            String conversationId = getText(root, "id"); // payload uses `id` for aggregate id (conversation)

            if (conversationId == null || conversationId.isEmpty()) {
                log.warn("Skipping message event without conversation id: {}", payload);
                return;
            }

            String messageId = messageIdHeader != null ? messageIdHeader : getText(root.path("data"), "messageId");

            // Dedup by messageId if present
            if (messageId != null && !messageId.isEmpty()) {
                String key = "processed:" + messageId;
                Boolean first = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", java.time.Duration.ofDays(1));
                if (Boolean.FALSE.equals(first)) {
                    // already processed
                    return;
                }
            }

            if (eventType == null) {
                log.warn("Unknown message event without eventType: {}", payload);
                return;
            }

            switch (eventType) {
                case "MESSAGE_SENT":
                case "MESSAGE_UPDATED":
                case "MESSAGE_DELETED":
                case "MESSAGE_SEEN":
                    webSocketHandler.broadcastToConversation(conversationId, payload);
                    break;
                default:
                    log.warn("Unknown message event type: {}", eventType);
            }
        } catch (Exception ex) {
            log.error("Failed to process message event payload: {}", payload, ex);
        }
    }

    private String getText(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text != null && text.isBlank() ? null : text;
    }
}



