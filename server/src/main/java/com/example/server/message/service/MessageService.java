package com.example.server.message.service;

import com.example.server.infrastructure.kafka.KafkaEventPublisher;
import com.example.server.message.model.Message;
import com.example.server.message.repository.MessageRepository;
import com.example.server.outbox.model.OutboxEvent;
import com.example.server.outbox.repository.OutboxEventRepository;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {
    
    private final MessageRepository messageRepository;
    private final KafkaEventPublisher kafkaEventPublisher;
    private final OutboxEventRepository outboxEventRepository;
    private final UserRepository userRepository;
    
    @Transactional
    public Message createMessage(String senderId, String conversationId, String content, String imageUrl, String messageId) {
        Message message = new Message();
        message.setSenderId(senderId);
        message.setConversationId(conversationId);
        message.setContent(content);
        message.setImageUrl(imageUrl);
        Instant now = Instant.now();
        message.setCreatedAt(now);
        message.setOriginalCreatedAt(now); // Store original creation time
        // Don't set updatedAt for new messages - only set when actually edited
        message.setUpdatedAt(null);
        if (messageId != null && !messageId.isBlank()) {
            message.setMessageId(messageId);
        }
        
        Message savedMessage = messageRepository.save(message);

        String kafkaMessageId = message.getMessageId() != null && !message.getMessageId().isBlank()
            ? message.getMessageId()
            : savedMessage.getId();

        // Enqueue outbox instead of direct publish (avoid nulls in Map.of)
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("messageId", kafkaMessageId);
        payload.put("senderId", senderId);
        addSenderMetadata(senderId, payload);
        if (content != null) payload.put("content", content);
        if (imageUrl != null) payload.put("imageUrl", imageUrl);
        payload.put("createdAt", savedMessage.getCreatedAt());

        OutboxEvent outbox = OutboxEvent.messageEvent(
            "MESSAGE_SENT",
            conversationId,
            payload
        );
        // Use kafkaMessageId as Kafka key and header messageId
        outbox.setEventId(kafkaMessageId);
        outboxEventRepository.save(outbox);
        
        log.info("Message created: {} in conversation {}", savedMessage.getId(), conversationId);
        return savedMessage;
    }

    private void addSenderMetadata(String senderId, java.util.Map<String, Object> payload) {
        try {
            userRepository.findById(senderId).ifPresent(user -> {
                payload.put("senderName", resolveDisplayName(user));
                payload.put("displayName", resolveDisplayName(user));
                payload.put("username", user.getUsername());
                if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
                    payload.put("avatarUrl", user.getAvatarUrl());
                }
            });
        } catch (Exception ex) {
            log.warn("Failed to enrich sender metadata for user {}", senderId, ex);
        }
    }

    private String resolveDisplayName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        return user.getUsername();
    }
    
    public List<Message> getMessagesByConversation(String conversationId, int page, int size) {
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Message> pageResult = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageRequest);
        List<Message> messages = pageResult.getContent();
        
        log.info("📨 MessageService: getMessagesByConversation - conversationId={}, page={}, size={}", 
            conversationId, page, size);
        log.info("📨 MessageService: Pagination info - totalElements={}, totalPages={}, returned {} messages", 
            pageResult.getTotalElements(), pageResult.getTotalPages(), messages.size());
        
        if (!messages.isEmpty()) {
            log.info("📨 MessageService: First message (newest) id={}, content={}, createdAt={}", 
                messages.get(0).getId(), messages.get(0).getContent(), messages.get(0).getCreatedAt());
            log.info("📨 MessageService: Last message (oldest in page) id={}, content={}, createdAt={}", 
                messages.get(messages.size() - 1).getId(), 
                messages.get(messages.size() - 1).getContent(), 
                messages.get(messages.size() - 1).getCreatedAt());
        }
        return messages;
    }
    
    @Transactional
    public Message updateMessage(String messageId, String userId, String content) {
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (!message.getSenderId().equals(userId)) {
            throw new RuntimeException("Unauthorized to update this message");
        }
        
        // Check if message can be edited (within 1 hour of original creation)
        Instant now = Instant.now();
        Instant originalCreatedAt = message.getOriginalCreatedAt() != null ? message.getOriginalCreatedAt() : message.getCreatedAt();
        long hoursSinceCreation = java.time.Duration.between(originalCreatedAt, now).toHours();
        if (hoursSinceCreation >= 1) {
            throw new RuntimeException("Message can only be edited within 1 hour of creation");
        }
        
        message.setContent(content);
        Instant editTime = Instant.now();
        message.setUpdatedAt(editTime);
        // Update createdAt to make it the newest message (move to bottom)
        // But keep originalCreatedAt unchanged to track if message was edited
        if (message.getOriginalCreatedAt() == null) {
            message.setOriginalCreatedAt(message.getCreatedAt()); // Store original if not set
        }
        message.setCreatedAt(editTime);
        
        Message updatedMessage = messageRepository.save(message);
        
        // Publish event to WebSocket service
        kafkaEventPublisher.publishMessageEvent("MESSAGE_UPDATED", message.getConversationId(), Map.of(
            "messageId", updatedMessage.getId(),
            "content", content,
            "updatedAt", updatedMessage.getUpdatedAt(),
            "createdAt", updatedMessage.getCreatedAt(), // Include new createdAt so frontend can sort
            "originalCreatedAt", updatedMessage.getOriginalCreatedAt() // Include original createdAt to check if edited
        ));
        
        return updatedMessage;
    }
    
    @Transactional
    public void deleteMessage(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (!message.getSenderId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this message");
        }
        
        messageRepository.delete(message);
        
        // Publish event to WebSocket service
        kafkaEventPublisher.publishMessageEvent("MESSAGE_DELETED", message.getConversationId(), Map.of(
            "messageId", messageId
        ));
    }
    
    public List<Message> searchMessages(String conversationId, String query, String senderId, Instant fromDate, Instant toDate, int page, int size) {
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size);
        
        // Escape special regex characters (treat search term as literal)
        String escapedQuery = java.util.regex.Pattern.quote(query);
        
        List<Message> messages;
        
        // Build query based on provided filters
        if (senderId != null && !senderId.isBlank() && fromDate != null && toDate != null) {
            // All filters
            messages = messageRepository.searchByContentSenderAndDateRange(
                conversationId, escapedQuery, senderId, fromDate, toDate, pageRequest);
        } else if (senderId != null && !senderId.isBlank()) {
            // Sender filter only
            messages = messageRepository.searchByContentAndSender(
                conversationId, escapedQuery, senderId, pageRequest);
        } else if (fromDate != null && toDate != null) {
            // Date range filter only
            messages = messageRepository.searchByContentAndDateRange(
                conversationId, escapedQuery, fromDate, toDate, pageRequest);
        } else {
            // Content only
            messages = messageRepository.searchByContent(conversationId, escapedQuery, pageRequest);
        }
        
        log.info("Search messages - conversationId={}, query={}, senderId={}, fromDate={}, toDate={}, found {} messages", 
            conversationId, query, senderId, fromDate, toDate, messages.size());
        
        return messages;
    }
    
    @Transactional
    public List<Message> forwardMessages(String senderId, List<String> messageIds, String targetConversationId, String comment) {
        if (messageIds == null || messageIds.isEmpty()) {
            throw new RuntimeException("At least one message ID is required");
        }
        
        List<Message> originalMessages = messageRepository.findAllById(messageIds);
        if (originalMessages.size() != messageIds.size()) {
            throw new RuntimeException("Some messages not found");
        }
        
        List<Message> forwardedMessages = new java.util.ArrayList<>();
        Instant now = Instant.now();
        
        for (Message originalMessage : originalMessages) {
            Message forwardedMessage = new Message();
            forwardedMessage.setSenderId(senderId);
            forwardedMessage.setConversationId(targetConversationId);
            
            // Copy image if exists
            if (originalMessage.getImageUrl() != null && !originalMessage.getImageUrl().isBlank()) {
                forwardedMessage.setImageUrl(originalMessage.getImageUrl());
            }
            
            // Build content: preserve original content structure (including file metadata JSON)
            String originalContent = originalMessage.getContent();
            if (originalContent != null && !originalContent.isBlank()) {
                // Try to parse as JSON to preserve file metadata
                try {
                    java.util.Map<String, Object> contentJson = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(originalContent, java.util.Map.class);
                    
                    if (contentJson.containsKey("__file__")) {
                        // Preserve file metadata structure
                        if (comment != null && !comment.isBlank()) {
                            contentJson.put("text", comment + "\n\n" + 
                                (contentJson.get("text") != null ? contentJson.get("text").toString() : ""));
                        }
                        forwardedMessage.setContent(new com.fasterxml.jackson.databind.ObjectMapper()
                            .writeValueAsString(contentJson));
                    } else {
                        // Regular text content
                        if (comment != null && !comment.isBlank()) {
                            forwardedMessage.setContent(comment + "\n\n" + originalContent);
                        } else {
                            forwardedMessage.setContent(originalContent);
                        }
                    }
                } catch (Exception e) {
                    // Not JSON, treat as plain text
                    if (comment != null && !comment.isBlank()) {
                        forwardedMessage.setContent(comment + "\n\n" + originalContent);
                    } else {
                        forwardedMessage.setContent(originalContent);
                    }
                }
            } else if (comment != null && !comment.isBlank()) {
                forwardedMessage.setContent(comment);
            }
            
            // Set forwarding metadata
            forwardedMessage.setForwardedFromMessageId(originalMessage.getId());
            forwardedMessage.setForwardedFromConversationId(originalMessage.getConversationId());
            forwardedMessage.setForwardedFromSenderId(originalMessage.getSenderId());
            forwardedMessage.setForwardedAt(now);
            
            // Get original sender name
            userRepository.findById(originalMessage.getSenderId()).ifPresent(user -> {
                forwardedMessage.setForwardedFromSenderName(resolveDisplayName(user));
            });
            
            forwardedMessage.setCreatedAt(now);
            forwardedMessage.setOriginalCreatedAt(now);
            forwardedMessage.setUpdatedAt(null);
            
            Message saved = messageRepository.save(forwardedMessage);
            forwardedMessages.add(saved);
            
            // Publish MESSAGE_SENT event for forwarded message
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("messageId", saved.getId());
            payload.put("senderId", senderId);
            addSenderMetadata(senderId, payload);
            payload.put("content", saved.getContent());
            if (saved.getImageUrl() != null) {
                payload.put("imageUrl", saved.getImageUrl());
            }
            payload.put("createdAt", saved.getCreatedAt());
            payload.put("forwardedFromMessageId", originalMessage.getId());
            payload.put("forwardedFromConversationId", originalMessage.getConversationId());
            payload.put("forwardedFromSenderId", originalMessage.getSenderId());
            payload.put("forwardedFromSenderName", saved.getForwardedFromSenderName());
            
            OutboxEvent outbox = OutboxEvent.messageEvent(
                "MESSAGE_SENT",
                targetConversationId,
                payload
            );
            outbox.setEventId(saved.getId());
            outboxEventRepository.save(outbox);
        }
        
        log.info("Forwarded {} messages from conversation {} to conversation {}", 
            forwardedMessages.size(), originalMessages.get(0).getConversationId(), targetConversationId);
        
        return forwardedMessages;
    }
}