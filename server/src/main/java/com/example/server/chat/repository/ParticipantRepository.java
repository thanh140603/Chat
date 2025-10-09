package com.example.server.chat.repository;

import com.example.server.chat.model.ConversationParticipant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ParticipantRepository extends MongoRepository<ConversationParticipant, String> {
}


