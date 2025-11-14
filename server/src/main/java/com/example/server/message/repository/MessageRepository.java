package com.example.server.message.repository;

import com.example.server.message.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    Page<Message> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);
    
    // Search messages by content in a conversation
    @Query("{ 'conversationId': ?0, 'content': { $regex: ?1, $options: 'i' } }")
    List<Message> searchByContent(String conversationId, String query, Pageable pageable);
    
    // Search by content and sender
    @Query("{ 'conversationId': ?0, 'content': { $regex: ?1, $options: 'i' }, 'senderId': ?2 }")
    List<Message> searchByContentAndSender(String conversationId, String query, String senderId, Pageable pageable);
    
    // Search by content and date range
    @Query("{ 'conversationId': ?0, 'content': { $regex: ?1, $options: 'i' }, 'createdAt': { $gte: ?2, $lte: ?3 } }")
    List<Message> searchByContentAndDateRange(String conversationId, String query, Instant fromDate, Instant toDate, Pageable pageable);
    
    // Search by content, sender and date range
    @Query("{ 'conversationId': ?0, 'content': { $regex: ?1, $options: 'i' }, 'senderId': ?2, 'createdAt': { $gte: ?3, $lte: ?4 } }")
    List<Message> searchByContentSenderAndDateRange(String conversationId, String query, String senderId, Instant fromDate, Instant toDate, Pageable pageable);
}


