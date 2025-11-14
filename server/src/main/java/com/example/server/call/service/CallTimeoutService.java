package com.example.server.call.service;

import com.example.server.call.model.Call;
import com.example.server.call.model.CallStatus;
import com.example.server.call.repository.CallRepository;
import com.example.server.infrastructure.kafka.KafkaEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Scheduled service to handle call timeouts.
 * Marks calls as MISSED if they are not answered within 60 seconds.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CallTimeoutService {
    
    private final CallRepository callRepository;
    private final KafkaEventPublisher kafkaEventPublisher;
    
    private static final int CALL_TIMEOUT_SECONDS = 60; // 60 seconds timeout
    
    /**
     * Runs every 30 seconds to check for timed-out calls.
     * Marks calls that have been INITIATED or RINGING for more than 60 seconds as MISSED.
     */
    @Scheduled(fixedDelay = 30000) // Run every 30 seconds
    @Transactional
    public void processTimedOutCalls() {
        Instant timeoutThreshold = Instant.now().minusSeconds(CALL_TIMEOUT_SECONDS);
        List<Call> timedOutCalls = callRepository.findTimedOutCalls(timeoutThreshold);
        
        if (timedOutCalls.isEmpty()) {
            return;
        }
        
        log.info("Processing {} timed-out calls", timedOutCalls.size());
        
        for (Call call : timedOutCalls) {
            try {
                // Mark call as MISSED
                call.setStatus(CallStatus.MISSED);
                call.setEndedAt(Instant.now());
                callRepository.save(call);
                
                log.info("Call timed out and marked as MISSED: callId={}, callerId={}, receiverId={}", 
                        call.getId(), call.getCallerId(), call.getReceiverId());
                
                // Notify caller that the call was missed
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("callId", call.getId());
                eventData.put("conversationId", call.getConversationId());
                eventData.put("receiverId", call.getReceiverId());
                eventData.put("type", call.getType().toString());
                eventData.put("timestamp", call.getEndedAt().toString());
                
                kafkaEventPublisher.publishUserEvent("CALL_MISSED", call.getCallerId(), eventData);
                
                // Also notify receiver (optional, but good for UX)
                kafkaEventPublisher.publishUserEvent("CALL_MISSED", call.getReceiverId(), eventData);
                
            } catch (Exception e) {
                log.error("Error processing timed-out call: callId={}", call.getId(), e);
            }
        }
    }
}

