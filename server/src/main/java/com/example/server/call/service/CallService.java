package com.example.server.call.service;

import com.example.server.call.dto.CallResponse;
import com.example.server.call.dto.InitiateCallRequest;
import com.example.server.call.model.Call;
import com.example.server.call.model.CallStatus;
import com.example.server.call.model.CallType;
import com.example.server.call.repository.CallRepository;
import com.example.server.chat.model.Conversation;
import com.example.server.chat.model.ConversationParticipant;
import com.example.server.chat.model.ConversationType;
import com.example.server.chat.repository.ConversationRepository;
import com.example.server.chat.repository.ParticipantRepository;
import com.example.server.common.exception.ApiException;
import com.example.server.infrastructure.kafka.KafkaEventPublisher;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class CallService {
    
    private final CallRepository callRepository;
    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final KafkaEventPublisher kafkaEventPublisher;
    
    public CallService(CallRepository callRepository,
                      ConversationRepository conversationRepository,
                      ParticipantRepository participantRepository,
                      UserRepository userRepository,
                      KafkaEventPublisher kafkaEventPublisher) {
        this.callRepository = callRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.kafkaEventPublisher = kafkaEventPublisher;
    }
    
    /**
     * Initiate call: create call record and publish event
     */
    @Transactional
    public CallResponse initiateCall(String callerId, InitiateCallRequest request) {
        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new ApiException("Conversation not found"));
        
        if (conversation.getType() != ConversationType.DIRECT) {
            throw new ApiException("Calls are only supported for direct conversations");
        }
        
        participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(request.getConversationId(), callerId)
                .orElseThrow(() -> new ApiException("You are not a participant in this conversation"));
        
        participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(request.getConversationId(), request.getReceiverId())
                .orElseThrow(() -> new ApiException("Receiver is not a participant in this conversation"));
        
        List<ConversationParticipant> participants = participantRepository
                .findByConversationIdAndIsActiveTrue(request.getConversationId());
        if (participants.size() != 2) {
            throw new ApiException("Direct conversation must have exactly 2 participants");
        }
        
        Call existingCall = callRepository.findActiveCallByConversationId(request.getConversationId())
                .orElse(null);
        if (existingCall != null) {
            log.info("Ending existing active call before initiating new one: callId={}", existingCall.getId());
            existingCall.setStatus(CallStatus.ENDED);
            existingCall.setEndedAt(Instant.now());
            existingCall.setEndedBy(callerId);
            if (existingCall.getAnsweredAt() != null) {
                existingCall.setDuration((int) (Instant.now().getEpochSecond() - existingCall.getAnsweredAt().getEpochSecond()));
            } else {
                existingCall.setDuration(0);
            }
            callRepository.save(existingCall);
            
            String otherUserId = existingCall.getCallerId().equals(callerId) 
                ? existingCall.getReceiverId() 
                : existingCall.getCallerId();
            Map<String, Object> endEventData = new HashMap<>();
            endEventData.put("callId", existingCall.getId());
            endEventData.put("conversationId", existingCall.getConversationId());
            endEventData.put("endedBy", callerId);
            endEventData.put("reason", "replaced_by_new_call");
            endEventData.put("timestamp", existingCall.getEndedAt().toString());
            kafkaEventPublisher.publishUserEvent("CALL_ENDED", otherUserId, endEventData);
        }
        
        Set<String> processedCallIds = new HashSet<>();
        if (existingCall != null) {
            processedCallIds.add(existingCall.getId());
        }
        
        List<Call> callerActiveCalls = callRepository.findActiveCallsByUserId(callerId);
        List<Call> receiverActiveCalls = callRepository.findActiveCallsByUserId(request.getReceiverId());
        
        for (Call activeCall : callerActiveCalls) {
            if (!processedCallIds.contains(activeCall.getId()) 
                    && !activeCall.getConversationId().equals(request.getConversationId())) {
                log.info("Ending active call in different conversation for caller: callId={}", activeCall.getId());
                activeCall.setStatus(CallStatus.ENDED);
                activeCall.setEndedAt(Instant.now());
                activeCall.setEndedBy(callerId);
                if (activeCall.getAnsweredAt() != null) {
                    activeCall.setDuration((int) (Instant.now().getEpochSecond() - activeCall.getAnsweredAt().getEpochSecond()));
                } else {
                    activeCall.setDuration(0);
                }
                callRepository.save(activeCall);
                processedCallIds.add(activeCall.getId());
                
                String otherUserId = activeCall.getCallerId().equals(callerId) 
                    ? activeCall.getReceiverId() 
                    : activeCall.getCallerId();
                Map<String, Object> endEventData = new HashMap<>();
                endEventData.put("callId", activeCall.getId());
                endEventData.put("conversationId", activeCall.getConversationId());
                endEventData.put("endedBy", callerId);
                endEventData.put("reason", "replaced_by_new_call");
                endEventData.put("timestamp", activeCall.getEndedAt().toString());
                kafkaEventPublisher.publishUserEvent("CALL_ENDED", otherUserId, endEventData);
            }
        }
        
        for (Call activeCall : receiverActiveCalls) {
            if (!processedCallIds.contains(activeCall.getId()) 
                    && !activeCall.getConversationId().equals(request.getConversationId())) {
                log.info("Ending active call in different conversation for receiver: callId={}", activeCall.getId());
                activeCall.setStatus(CallStatus.ENDED);
                activeCall.setEndedAt(Instant.now());
                activeCall.setEndedBy(callerId);
                if (activeCall.getAnsweredAt() != null) {
                    activeCall.setDuration((int) (Instant.now().getEpochSecond() - activeCall.getAnsweredAt().getEpochSecond()));
                } else {
                    activeCall.setDuration(0);
                }
                callRepository.save(activeCall);
                processedCallIds.add(activeCall.getId());
                
                String otherUserId = activeCall.getCallerId().equals(request.getReceiverId()) 
                    ? activeCall.getReceiverId() 
                    : activeCall.getCallerId();
                Map<String, Object> endEventData = new HashMap<>();
                endEventData.put("callId", activeCall.getId());
                endEventData.put("conversationId", activeCall.getConversationId());
                endEventData.put("endedBy", callerId);
                endEventData.put("reason", "replaced_by_new_call");
                endEventData.put("timestamp", activeCall.getEndedAt().toString());
                kafkaEventPublisher.publishUserEvent("CALL_ENDED", otherUserId, endEventData);
            }
        }
        
        Call call = new Call();
        call.setConversationId(request.getConversationId());
        call.setCallerId(callerId);
        call.setReceiverId(request.getReceiverId());
        call.setType(CallType.valueOf(request.getType().toUpperCase()));
        call.setStatus(CallStatus.INITIATED);
        call.setStartedAt(Instant.now());
        
        Call savedCall = callRepository.save(call);
        
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ApiException("Caller not found"));
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ApiException("Receiver not found"));
        
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("callId", savedCall.getId());
        eventData.put("conversationId", savedCall.getConversationId());
        eventData.put("callerId", savedCall.getCallerId());
        eventData.put("callerName", caller.getDisplayName() != null ? caller.getDisplayName() : caller.getUsername());
        eventData.put("callerAvatarUrl", caller.getAvatarUrl());
        eventData.put("receiverId", savedCall.getReceiverId());
        eventData.put("type", savedCall.getType().toString());
        eventData.put("timestamp", savedCall.getStartedAt().toString());
        
        kafkaEventPublisher.publishUserEvent("CALL_INITIATED", request.getReceiverId(), eventData);
        
        log.info("Call initiated: callId={}, callerId={}, receiverId={}, type={}", 
                savedCall.getId(), callerId, request.getReceiverId(), savedCall.getType());
        
        return toResponse(savedCall, caller, receiver);
    }
    
    /**
     * Answer call: update status and publish event
     */
    @Transactional
    public CallResponse answerCall(String callId, String userId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ApiException("Call not found"));
        
        if (!call.getReceiverId().equals(userId)) {
            throw new ApiException("Only the receiver can answer this call");
        }
        
        if (call.getStatus() != CallStatus.INITIATED) {
            throw new ApiException("Call is not in a state that can be answered");
        }
        
        call.setStatus(CallStatus.ANSWERED);
        call.setAnsweredAt(Instant.now());
        Call savedCall = callRepository.save(call);
        
        User caller = userRepository.findById(call.getCallerId())
                .orElseThrow(() -> new ApiException("Caller not found"));
        User receiver = userRepository.findById(call.getReceiverId())
                .orElseThrow(() -> new ApiException("Receiver not found"));
        
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("callId", savedCall.getId());
        eventData.put("conversationId", savedCall.getConversationId());
        eventData.put("receiverId", savedCall.getReceiverId());
        eventData.put("timestamp", savedCall.getAnsweredAt().toString());
        
        kafkaEventPublisher.publishUserEvent("CALL_ANSWERED", call.getCallerId(), eventData);
        
        log.info("Call answered: callId={}, receiverId={}", callId, userId);
        
        return toResponse(savedCall, caller, receiver);
    }
    
    /**
     * Reject call: update status and publish event
     */
    @Transactional
    public CallResponse rejectCall(String callId, String userId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ApiException("Call not found"));
        
        if (!call.getReceiverId().equals(userId)) {
            throw new ApiException("Only the receiver can reject this call");
        }
        
        if (call.getStatus() != CallStatus.INITIATED) {
            throw new ApiException("Call is not in a state that can be rejected");
        }
        
        call.setStatus(CallStatus.REJECTED);
        call.setEndedAt(Instant.now());
        call.setEndedBy(userId);
        Call savedCall = callRepository.save(call);
        
        User caller = userRepository.findById(call.getCallerId())
                .orElseThrow(() -> new ApiException("Caller not found"));
        User receiver = userRepository.findById(call.getReceiverId())
                .orElseThrow(() -> new ApiException("Receiver not found"));
        
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("callId", savedCall.getId());
        eventData.put("conversationId", savedCall.getConversationId());
        eventData.put("receiverId", savedCall.getReceiverId());
        eventData.put("timestamp", savedCall.getEndedAt().toString());
        
        kafkaEventPublisher.publishUserEvent("CALL_REJECTED", call.getCallerId(), eventData);
        
        log.info("Call rejected: callId={}, receiverId={}", callId, userId);
        
        return toResponse(savedCall, caller, receiver);
    }
    
    /**
     * End call: calculate duration, update status and publish event
     */
    @Transactional
    public CallResponse endCall(String callId, String userId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ApiException("Call not found"));
        
        if (!call.getCallerId().equals(userId) && !call.getReceiverId().equals(userId)) {
            throw new ApiException("You are not a participant in this call");
        }
        
        if (call.getStatus() != CallStatus.ANSWERED) {
            throw new ApiException("Call is not active");
        }
        
        Instant now = Instant.now();
        int duration = 0;
        if (call.getAnsweredAt() != null) {
            duration = (int) (now.getEpochSecond() - call.getAnsweredAt().getEpochSecond());
        }
        
        call.setStatus(CallStatus.ENDED);
        call.setEndedAt(now);
        call.setEndedBy(userId);
        call.setDuration(duration);
        Call savedCall = callRepository.save(call);
        
        User caller = userRepository.findById(call.getCallerId())
                .orElseThrow(() -> new ApiException("Caller not found"));
        User receiver = userRepository.findById(call.getReceiverId())
                .orElseThrow(() -> new ApiException("Receiver not found"));
        
        String otherUserId = call.getCallerId().equals(userId) ? call.getReceiverId() : call.getCallerId();
        
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("callId", savedCall.getId());
        eventData.put("conversationId", savedCall.getConversationId());
        eventData.put("endedBy", userId);
        eventData.put("duration", duration);
        eventData.put("timestamp", savedCall.getEndedAt().toString());
        
        kafkaEventPublisher.publishUserEvent("CALL_ENDED", otherUserId, eventData);
        
        log.info("Call ended: callId={}, endedBy={}, duration={}s", callId, userId, duration);
        
        return toResponse(savedCall, caller, receiver);
    }
    
    /**
     * Get call history for user or conversation
     */
    public Page<CallResponse> getCallHistory(String userId, String conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Call> calls;
        
        if (conversationId != null && !conversationId.isBlank()) {
            calls = callRepository.findCallHistoryByConversationId(conversationId, pageable);
        } else {
            calls = callRepository.findCallHistoryByUserId(userId, pageable);
        }
        
        return calls.map(call -> {
            User caller = userRepository.findById(call.getCallerId()).orElse(null);
            User receiver = userRepository.findById(call.getReceiverId()).orElse(null);
            return toResponse(call, caller, receiver);
        });
    }
    
    /**
     * Get active calls list for user
     */
    public List<CallResponse> getActiveCalls(String userId) {
        List<Call> activeCalls = callRepository.findActiveCallsByUserId(userId);
        return activeCalls.stream().map(call -> {
            User caller = userRepository.findById(call.getCallerId()).orElse(null);
            User receiver = userRepository.findById(call.getReceiverId()).orElse(null);
            return toResponse(call, caller, receiver);
        }).toList();
    }
    
    /**
     * Get call info by ID
     */
    public CallResponse getCallById(String callId, String userId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ApiException("Call not found"));
        
        if (!call.getCallerId().equals(userId) && !call.getReceiverId().equals(userId)) {
            throw new ApiException("You are not a participant in this call");
        }
        
        User caller = userRepository.findById(call.getCallerId()).orElse(null);
        User receiver = userRepository.findById(call.getReceiverId()).orElse(null);
        
        return toResponse(call, caller, receiver);
    }
    
    /**
     * Convert Call entity to CallResponse DTO
     */
    private CallResponse toResponse(Call call, User caller, User receiver) {
        CallResponse response = new CallResponse();
        response.setId(call.getId());
        response.setConversationId(call.getConversationId());
        response.setCallerId(call.getCallerId());
        if (caller != null) {
            response.setCallerName(caller.getDisplayName() != null ? caller.getDisplayName() : caller.getUsername());
            response.setCallerAvatarUrl(caller.getAvatarUrl());
        }
        response.setReceiverId(call.getReceiverId());
        if (receiver != null) {
            response.setReceiverName(receiver.getDisplayName() != null ? receiver.getDisplayName() : receiver.getUsername());
            response.setReceiverAvatarUrl(receiver.getAvatarUrl());
        }
        response.setType(call.getType());
        response.setStatus(call.getStatus());
        response.setStartedAt(call.getStartedAt());
        response.setAnsweredAt(call.getAnsweredAt());
        response.setEndedAt(call.getEndedAt());
        response.setEndedBy(call.getEndedBy());
        response.setDuration(call.getDuration());
        return response;
    }
}

