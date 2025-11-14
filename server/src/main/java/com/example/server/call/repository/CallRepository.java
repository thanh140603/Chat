package com.example.server.call.repository;

import com.example.server.call.model.Call;
import com.example.server.call.model.CallStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CallRepository extends MongoRepository<Call, String> {
    
    // Find active calls for a user (either as caller or receiver)
    @Query("{ $or: [ { callerId: ?0 }, { receiverId: ?0 } ], status: { $in: ['INITIATED', 'RINGING', 'ANSWERED'] } }")
    List<Call> findActiveCallsByUserId(String userId);
    
    // Find call by conversation and status
    @Query("{ conversationId: ?0, status: { $in: ['INITIATED', 'RINGING', 'ANSWERED'] } }")
    Optional<Call> findActiveCallByConversationId(String conversationId);
    
    // Find call history for a user
    @Query("{ $or: [ { callerId: ?0 }, { receiverId: ?0 } ], status: { $in: ['ENDED', 'REJECTED', 'MISSED'] } }")
    Page<Call> findCallHistoryByUserId(String userId, Pageable pageable);
    
    // Find call history for a conversation
    @Query("{ conversationId: ?0, status: { $in: ['ENDED', 'REJECTED', 'MISSED'] } }")
    Page<Call> findCallHistoryByConversationId(String conversationId, Pageable pageable);
    
    // Find calls by conversation ID (all statuses)
    List<Call> findByConversationId(String conversationId);
    
    // Find calls by conversation ID and status
    List<Call> findByConversationIdAndStatus(String conversationId, CallStatus status);
    
    // Find calls that are INITIATED or RINGING and started before a certain time (for timeout)
    @Query("{ status: { $in: ['INITIATED', 'RINGING'] }, startedAt: { $lt: ?0 } }")
    List<Call> findTimedOutCalls(Instant beforeTime);
}

