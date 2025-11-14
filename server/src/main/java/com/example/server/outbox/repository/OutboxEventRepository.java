package com.example.server.outbox.repository;

import com.example.server.outbox.model.OutboxEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OutboxEventRepository extends MongoRepository<OutboxEvent, String> {
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(String status);
}


