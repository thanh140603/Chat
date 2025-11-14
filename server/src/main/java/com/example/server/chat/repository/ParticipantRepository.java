package com.example.server.chat.repository;

import com.example.server.chat.model.ConversationParticipant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends MongoRepository<ConversationParticipant, String> {
    
    // Find all participants of a conversation
    @Query("{ 'conversationId': ?0, 'isActive': true }")
    List<ConversationParticipant> findByConversationIdAndIsActiveTrue(String conversationId);
    
    // Find all conversations a user participates in
    @Query("{ 'userId': ?0, 'isActive': true }")
    List<ConversationParticipant> findByUserIdAndIsActiveTrue(String userId);
    
    // Find specific participant
    @Query("{ 'conversationId': ?0, 'userId': ?1, 'isActive': true }")
    Optional<ConversationParticipant> findByConversationIdAndUserIdAndIsActiveTrue(String conversationId, String userId);
    
    // Check if user is participant
    @Query(value = "{ 'conversationId': ?0, 'userId': ?1, 'isActive': true }", exists = true)
    boolean existsByConversationIdAndUserIdAndIsActiveTrue(String conversationId, String userId);
    
    // Find participants by role
    @Query("{ 'conversationId': ?0, 'role': ?1, 'isActive': true }")
    List<ConversationParticipant> findByConversationIdAndRoleAndIsActiveTrue(String conversationId, com.example.server.chat.model.ParticipantRole role);
    
    // Count active participants
    @Query(value = "{ 'conversationId': ?0, 'isActive': true }", count = true)
    long countByConversationIdAndIsActiveTrue(String conversationId);
    
    // Find all participants (including inactive)
    List<ConversationParticipant> findByConversationId(String conversationId);
    
    // Find participant by conversation and user (including inactive)
    @Query("{ 'conversationId': ?0, 'userId': ?1 }")
    Optional<ConversationParticipant> findByConversationIdAndUserId(String conversationId, String userId);
}


