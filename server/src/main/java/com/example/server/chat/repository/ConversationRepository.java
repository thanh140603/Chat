package com.example.server.chat.repository;

import com.example.server.chat.model.Conversation;
import com.example.server.chat.model.ConversationType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends MongoRepository<Conversation, String> {
    
    // Find conversations by participant (through participants collection)
    @Query("{ '_id': { $in: ?0 } }")
    List<Conversation> findByIds(List<String> conversationIds);
    
    // Find direct conversation between two users
    @Query("{ 'type': 'DIRECT', 'participants': { $all: [?0, ?1] } }")
    Optional<Conversation> findDirectConversation(String user1Id, String user2Id);
    
    // Find conversations by type
    List<Conversation> findByType(ConversationType type);
    
    // Find conversations created by user (for groups)
    List<Conversation> findByGroupCreatedByUserId(String userId);
}


