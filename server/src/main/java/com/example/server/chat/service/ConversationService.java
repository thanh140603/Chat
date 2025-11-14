package com.example.server.chat.service;

import com.example.server.chat.dto.AddMembersRequest;
import com.example.server.chat.dto.ConversationRequest;
import com.example.server.chat.dto.ConversationResponse;
import com.example.server.chat.dto.ConversationUpdateRequest;
import com.example.server.chat.dto.UpdateParticipantRoleRequest;
import com.example.server.chat.mapper.ConversationMapper;
import com.example.server.chat.model.Conversation;
import com.example.server.chat.model.ConversationParticipant;
import com.example.server.chat.model.ConversationType;
import com.example.server.chat.model.ParticipantRole;
import com.example.server.chat.repository.ConversationRepository;
import com.example.server.chat.repository.ParticipantRepository;
import com.example.server.common.exception.ApiException;
import com.example.server.infrastructure.kafka.KafkaEventPublisher;
import com.example.server.infrastructure.storage.FileStorageService;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import com.example.server.message.repository.MessageRepository;
import com.example.server.message.model.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ConversationService {
    
    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final KafkaEventPublisher kafkaEventPublisher;
    private final MessageRepository messageRepository;
    private final FileStorageService fileStorageService;
    
    public ConversationService(ConversationRepository conversationRepository,
                              ParticipantRepository participantRepository,
                              UserRepository userRepository,
                              ConversationMapper conversationMapper,
                              KafkaEventPublisher kafkaEventPublisher,
                              MessageRepository messageRepository,
                              FileStorageService fileStorageService) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.conversationMapper = conversationMapper;
        this.kafkaEventPublisher = kafkaEventPublisher;
        this.messageRepository = messageRepository;
        this.fileStorageService = fileStorageService;
    }
    
    /**
     * Create new conversation with participants
     */
    @Transactional
    public ConversationResponse create(String creatorId, ConversationRequest request) {
        List<String> allUserIds = request.getMemberIds();
        allUserIds.add(creatorId);
        
        List<User> users = userRepository.findAllById(allUserIds);
        if (users.size() != allUserIds.size()) {
            throw new ApiException("Some users not found");
        }
        
        Conversation conversation = conversationMapper.toEntity(request);
        conversation.setGroupCreatedByUserId(creatorId);
        
        Conversation savedConversation = conversationRepository.save(conversation);
        
        for (String userId : allUserIds) {
            ConversationParticipant participant = new ConversationParticipant();
            participant.setConversationId(savedConversation.getId());
            participant.setUserId(userId);
            participant.setJoinedAt(Instant.now());
            participant.setRole(userId.equals(creatorId) ? ParticipantRole.ADMIN : ParticipantRole.MEMBER);
            participant.setActive(true);
            participant.setUnreadCount(0);
            
            participantRepository.save(participant);
        }
        
        return conversationMapper.toResponse(savedConversation);
    }
    
    /**
     * Get user conversations list with participants info and unread count
     */
    public List<ConversationResponse> getUserConversations(String userId) {
        List<ConversationParticipant> participants = participantRepository.findByUserIdAndIsActiveTrue(userId);
        List<String> conversationIds = participants.stream()
                .map(ConversationParticipant::getConversationId)
                .collect(Collectors.toList());
        
        if (conversationIds.isEmpty()) {
            return List.of();
        }
        
        List<Conversation> conversations = conversationRepository.findByIds(conversationIds);
        
        return conversations.stream()
                .map(conversation -> {
                    ConversationResponse response = conversationMapper.toResponse(conversation);
                    
                    List<ConversationParticipant> conversationParticipants = participantRepository
                            .findByConversationIdAndIsActiveTrue(conversation.getId());
                    
                    List<ConversationResponse.ParticipantResponse> participantResponses = conversationParticipants.stream()
                            .map(participant -> {
                                User user = userRepository.findById(participant.getUserId()).orElse(null);
                                if (user == null) return null;
                                
                                ConversationResponse.ParticipantResponse participantResponse = new ConversationResponse.ParticipantResponse();
                                participantResponse.setId(user.getId());
                                participantResponse.setUsername(user.getUsername());
                                participantResponse.setDisplayName(user.getDisplayName());
                                participantResponse.setAvatarUrl(user.getAvatarUrl());
                                participantResponse.setRole(participant.getRole().name().toLowerCase());
                                participantResponse.setJoinedAt(participant.getJoinedAt());
                                participantResponse.setLastSeenAt(participant.getLastSeenAt());
                                participantResponse.setLastReadMessageId(participant.getLastReadMessageId());
                                return participantResponse;
                            })
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.toList());
                    
                    response.setParticipants(participantResponses);
                    
                    if (conversation.getType() == ConversationType.DIRECT) {
                        String otherPersonName = participantResponses.stream()
                                .filter(p -> !p.getId().equals(userId))
                                .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                                .findFirst()
                                .orElse("Unknown");
                        response.setName(otherPersonName);
                        String otherAvatar = participantResponses.stream()
                                .filter(p -> !p.getId().equals(userId))
                                .map(ConversationResponse.ParticipantResponse::getAvatarUrl)
                                .filter(java.util.Objects::nonNull)
                                .findFirst()
                                .orElse(null);
                        response.setAvatarUrl(otherAvatar);
                    } else if (conversation.getType() == ConversationType.GROUP) {
                        if (conversation.getGroupName() != null && !conversation.getGroupName().trim().isEmpty()) {
                            response.setName(conversation.getGroupName());
                        } else {
                            String membersList = participantResponses.stream()
                                    .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                                    .collect(Collectors.joining(", "));
                            response.setName(membersList.isEmpty() ? "Group Chat" : membersList);
                        }
                        response.setAvatarUrl(conversation.getGroupAvatarUrl());
                    }
                    
                    ConversationParticipant userParticipant = conversationParticipants.stream()
                            .filter(p -> p.getUserId().equals(userId))
                            .findFirst()
                            .orElse(null);
                    
                    if (userParticipant != null) {
                        response.setUnreadCount((int) userParticipant.getUnreadCount());
                        response.setFavorite(userParticipant.isFavorite());
                        response.setMuted(userParticipant.isMuted());
                    }
                    
                    if (conversation.getPinnedMessageId() != null) {
                        response.setPinnedMessageId(conversation.getPinnedMessageId());
                        response.setPinnedAt(conversation.getPinnedAt());
                        response.setPinnedByUserId(conversation.getPinnedByUserId());
                    }
                    
                    return response;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get conversation by ID
     */
    public ConversationResponse getById(String conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException("Conversation not found"));
        
        ConversationResponse response = conversationMapper.toResponse(conversation);
        
        if (conversation.getPinnedMessageId() != null) {
            response.setPinnedMessageId(conversation.getPinnedMessageId());
            response.setPinnedAt(conversation.getPinnedAt());
            response.setPinnedByUserId(conversation.getPinnedByUserId());
        }

        if (conversation.getType() == ConversationType.GROUP) {
            response.setAvatarUrl(conversation.getGroupAvatarUrl());
        }
        
        return response;
    }
    
    /**
     * Update conversation info (group name, avatar)
     */
    @Transactional
    public ConversationResponse updateConversation(String conversationId, String requesterId, ConversationUpdateRequest request) {
        participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, requesterId)
                .orElseThrow(() -> new ApiException("You are not a participant"));

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException("Conversation not found"));
        
        if (conversation.getType() != ConversationType.GROUP) {
            throw new ApiException("Only group conversations can be updated");
        }
        
        boolean changed = false;
        
        if (request.getGroupName() != null && !request.getGroupName().isBlank()
                && !request.getGroupName().equals(conversation.getGroupName())) {
            conversation.setGroupName(request.getGroupName());
            changed = true;
        }
        
        if (request.getGroupAvatarUrl() != null && !request.getGroupAvatarUrl().isBlank()
                && !request.getGroupAvatarUrl().equals(conversation.getGroupAvatarUrl())) {
            conversation.setGroupAvatarUrl(request.getGroupAvatarUrl());
            changed = true;
        }
        
        if (changed) {
            conversationRepository.save(conversation);
        }
        
        return getById(conversationId);
    }
    
    /**
     * Add members to conversation
     */
    @Transactional
    public ConversationResponse addMembers(String conversationId, String requesterId, AddMembersRequest request) {
        participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, requesterId)
                .orElseThrow(() -> new ApiException("You are not a participant"));

        List<User> users = userRepository.findAllById(request.getMemberIds());
        if (users.size() != request.getMemberIds().size()) {
            throw new ApiException("Some users not found");
        }
        
        for (String userId : request.getMemberIds()) {
            if (participantRepository.existsByConversationIdAndUserIdAndIsActiveTrue(conversationId, userId)) {
                continue;
            }
            
            ConversationParticipant participant = new ConversationParticipant();
            participant.setConversationId(conversationId);
            participant.setUserId(userId);
            participant.setJoinedAt(Instant.now());
            participant.setRole(ParticipantRole.MEMBER);
            participant.setActive(true);
            participant.setUnreadCount(0);
            
            participantRepository.save(participant);
        }
        
        return getById(conversationId);
    }
    
    /**
     * Update participant role (only admins allowed)
     */
    @Transactional
    public ConversationResponse updateParticipantRole(String conversationId, String participantId, 
                                                     String requesterId, UpdateParticipantRoleRequest request) {
        ConversationParticipant requesterParticipant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, requesterId)
                .orElseThrow(() -> new ApiException("You are not a participant"));
        
        if (requesterParticipant.getRole() != ParticipantRole.ADMIN) {
            throw new ApiException("Only admins can update roles");
        }
        
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, participantId)
                .orElseThrow(() -> new ApiException("Participant not found in this conversation"));
        
        ParticipantRole requestedRole = ParticipantRole.valueOf(request.getRole().toUpperCase());

        if (participant.getRole() == ParticipantRole.ADMIN
                && !participant.getUserId().equals(requesterId)
                && requestedRole != ParticipantRole.ADMIN) {
            throw new ApiException("You cannot change another admin's role");
        }

        participant.setRole(requestedRole);
        participantRepository.save(participant);
        
        return getById(conversationId);
    }
    
    /**
     * Remove participant from conversation (only admins allowed)
     */
    @Transactional
    public void removeParticipant(String conversationId, String participantId, String requesterId) {
        ConversationParticipant requesterParticipant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, requesterId)
                .orElseThrow(() -> new ApiException("You are not a participant"));
        
        if (requesterParticipant.getRole() != ParticipantRole.ADMIN) {
            throw new ApiException("Only admins can remove participants");
        }
        
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, participantId)
                .orElseThrow(() -> new ApiException("Participant not found in this conversation"));

        if (participant.getRole() == ParticipantRole.ADMIN
                && !participant.getUserId().equals(requesterId)) {
            throw new ApiException("You cannot remove another admin from the conversation");
        }
        
        participant.setActive(false);
        participantRepository.save(participant);
    }

    /**
     * Update group conversation avatar
     */
    @Transactional
    public ConversationResponse updateGroupAvatar(String conversationId, String requesterId, org.springframework.web.multipart.MultipartFile file) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException("Conversation not found"));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new ApiException("Only group conversations can update avatar");
        }

        participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, requesterId)
                .orElseThrow(() -> new ApiException("You are not a participant"));

        String avatarUrl = fileStorageService.uploadGroupAvatar(file);
        conversation.setGroupAvatarUrl(avatarUrl);
        conversationRepository.save(conversation);
        return getById(conversationId);
    }
    
    /**
     * User leaves conversation
     */
    @Transactional
    public void leaveConversation(String conversationId, String userId) {
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, userId)
                .orElseThrow(() -> new ApiException("You are not a participant"));
        
        participant.setActive(false);
        participantRepository.save(participant);
    }

    /**
     * Mark conversation as read: update lastReadMessageId and unreadCount
     */
    @Transactional
    public void markAsSeen(String conversationId, String userId) {
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserIdAndIsActiveTrue(conversationId, userId)
                .orElseThrow(() -> new ApiException("You are not a participant"));
        
        org.springframework.data.domain.Page<Message> latestMessagesPage = messageRepository.findByConversationIdOrderByCreatedAtDesc(
            conversationId, 
            org.springframework.data.domain.PageRequest.of(0, 1)
        );
        List<Message> latestMessages = latestMessagesPage.getContent();
        
        Instant now = Instant.now();
        String lastReadMessageId = null;
        
        if (!latestMessages.isEmpty()) {
            Message latestMessage = latestMessages.get(0);
            lastReadMessageId = latestMessage.getId();
            participant.setLastSeenAt(latestMessage.getCreatedAt().isAfter(now) ? now : latestMessage.getCreatedAt());
        } else {
            participant.setLastSeenAt(now);
        }
        
        participant.setLastReadMessageId(lastReadMessageId);
        participant.setUnreadCount(0);
        participantRepository.save(participant);
        
        Map<String, Object> eventData = new java.util.HashMap<>();
        eventData.put("userId", userId);
        eventData.put("conversationId", conversationId);
        eventData.put("lastSeenAt", participant.getLastSeenAt());
        eventData.put("unreadCount", participant.getUnreadCount());
        eventData.put("lastReadMessageId", lastReadMessageId);
        kafkaEventPublisher.publishMessageEvent("MESSAGE_SEEN", conversationId, eventData);
        
        log.info("User {} marked conversation {} as seen. Last read message: {}", userId, conversationId, lastReadMessageId);
    }
    
    /**
     * Create sample conversation for new user
     */
    @Transactional
    public ConversationResponse createSampleConversation(String userId) {
        ConversationRequest request = new ConversationRequest();
        request.setType("GROUP");
        request.setGroupName("Welcome to Chat App!");
        request.setMemberIds(List.of());
        
        ConversationResponse response = create(userId, request);
        
        log.info("Created sample conversation for user {}", userId);
        return response;
    }

    /**
     * Ensure DIRECT conversation exists between two users, create if not exists
     */
    @Transactional
    public ConversationResponse ensureDirectBetweenUsers(String userAId, String userBId) {
        if (userAId.equals(userBId)) {
            throw new ApiException("Cannot create direct conversation with self");
        }

        List<ConversationParticipant> aParts = participantRepository.findByUserIdAndIsActiveTrue(userAId);
        List<ConversationParticipant> bParts = participantRepository.findByUserIdAndIsActiveTrue(userBId);

        java.util.Set<String> aConvIds = aParts.stream().map(ConversationParticipant::getConversationId).collect(java.util.stream.Collectors.toSet());
        java.util.Set<String> bConvIds = bParts.stream().map(ConversationParticipant::getConversationId).collect(java.util.stream.Collectors.toSet());

        aConvIds.retainAll(bConvIds);

        if (!aConvIds.isEmpty()) {
            List<Conversation> candidates = conversationRepository.findByIds(new java.util.ArrayList<>(aConvIds));
            for (Conversation c : candidates) {
                if (c.getType() == ConversationType.DIRECT) {
                    List<ConversationParticipant> ps = participantRepository.findByConversationIdAndIsActiveTrue(c.getId());
                    if (ps.size() == 2) {
                        return conversationMapper.toResponse(c);
                    }
                }
            }
        }

        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.DIRECT);
        Conversation saved = conversationRepository.save(conversation);

        ConversationParticipant pA = new ConversationParticipant();
        pA.setConversationId(saved.getId());
        pA.setUserId(userAId);
        pA.setJoinedAt(java.time.Instant.now());
        pA.setRole(ParticipantRole.MEMBER);
        pA.setActive(true);
        pA.setUnreadCount(0);
        participantRepository.save(pA);

        ConversationParticipant pB = new ConversationParticipant();
        pB.setConversationId(saved.getId());
        pB.setUserId(userBId);
        pB.setJoinedAt(java.time.Instant.now());
        pB.setRole(ParticipantRole.MEMBER);
        pB.setActive(true);
        pB.setUnreadCount(0);
        participantRepository.save(pB);

        return conversationMapper.toResponse(saved);
    }
    
    /**
     * Toggle favorite for conversation
     */
    @Transactional
    public ConversationResponse toggleFavorite(String conversationId, String userId) {
        ConversationParticipant participant = participantRepository
            .findByConversationIdAndUserId(conversationId, userId)
            .orElseThrow(() -> new ApiException("Participant not found"));
        
        participant.setFavorite(!participant.isFavorite());
        participantRepository.save(participant);
        
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ApiException("Conversation not found"));
        
        ConversationResponse response = conversationMapper.toResponse(conversation);
        
        List<ConversationParticipant> conversationParticipants = participantRepository
            .findByConversationIdAndIsActiveTrue(conversationId);
        
        List<ConversationResponse.ParticipantResponse> participantResponses = conversationParticipants.stream()
            .map(p -> {
                User user = userRepository.findById(p.getUserId()).orElse(null);
                if (user == null) return null;
                
                ConversationResponse.ParticipantResponse pr = new ConversationResponse.ParticipantResponse();
                pr.setId(user.getId());
                pr.setUsername(user.getUsername());
                pr.setDisplayName(user.getDisplayName());
                pr.setAvatarUrl(user.getAvatarUrl());
                pr.setRole(p.getRole().name().toLowerCase());
                pr.setJoinedAt(p.getJoinedAt());
                pr.setLastSeenAt(p.getLastSeenAt());
                pr.setLastReadMessageId(p.getLastReadMessageId());
                return pr;
            })
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toList());
        
        response.setParticipants(participantResponses);
        
        ConversationParticipant userParticipant = conversationParticipants.stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElse(null);
        
        if (userParticipant != null) {
            response.setFavorite(userParticipant.isFavorite());
            response.setMuted(userParticipant.isMuted());
            response.setUnreadCount((int) userParticipant.getUnreadCount());
        }
        
        // Set name
        if (conversation.getType() == ConversationType.DIRECT) {
            String otherPersonName = participantResponses.stream()
                .filter(p -> !p.getId().equals(userId))
                .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                .findFirst()
                .orElse("Unknown");
            response.setName(otherPersonName);
            String otherAvatar = participantResponses.stream()
                .filter(p -> !p.getId().equals(userId))
                .map(ConversationResponse.ParticipantResponse::getAvatarUrl)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
            response.setAvatarUrl(otherAvatar);
        } else if (conversation.getType() == ConversationType.GROUP) {
            if (conversation.getGroupName() != null && !conversation.getGroupName().trim().isEmpty()) {
                response.setName(conversation.getGroupName());
            } else {
                String membersList = participantResponses.stream()
                    .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                    .collect(Collectors.joining(", "));
                response.setName(membersList.isEmpty() ? "Group Chat" : membersList);
            }
            response.setAvatarUrl(conversation.getGroupAvatarUrl());
        }
        
        return response;
    }
    
    /**
     * Pin message in conversation
     */
    @Transactional
    public ConversationResponse pinMessage(String conversationId, String messageId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ApiException("Conversation not found"));
        
        if (!participantRepository.existsByConversationIdAndUserIdAndIsActiveTrue(conversationId, userId)) {
            throw new ApiException("You are not a participant");
        }
        
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new ApiException("Message not found"));
        
        if (!message.getConversationId().equals(conversationId)) {
            throw new ApiException("Message does not belong to this conversation");
        }
        
        conversation.setPinnedMessageId(messageId);
        conversation.setPinnedAt(Instant.now());
        conversation.setPinnedByUserId(userId);
        conversationRepository.save(conversation);
        
        return getById(conversationId);
    }
    
    /**
     * Unpin message in conversation
     */
    @Transactional
    public ConversationResponse unpinMessage(String conversationId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ApiException("Conversation not found"));
        
        if (!participantRepository.existsByConversationIdAndUserIdAndIsActiveTrue(conversationId, userId)) {
            throw new ApiException("You are not a participant");
        }
        
        conversation.setPinnedMessageId(null);
        conversation.setPinnedAt(null);
        conversation.setPinnedByUserId(null);
        conversationRepository.save(conversation);
        
        return getById(conversationId);
    }
    
    /**
     * Toggle mute for conversation
     */
    @Transactional
    public ConversationResponse toggleMute(String conversationId, String userId) {
        ConversationParticipant participant = participantRepository
            .findByConversationIdAndUserId(conversationId, userId)
            .orElseThrow(() -> new ApiException("Participant not found"));
        
        participant.setMuted(!participant.isMuted());
        participantRepository.save(participant);
        
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ApiException("Conversation not found"));
        
        ConversationResponse response = conversationMapper.toResponse(conversation);
        
        List<ConversationParticipant> conversationParticipants = participantRepository
            .findByConversationIdAndIsActiveTrue(conversationId);
        
        List<ConversationResponse.ParticipantResponse> participantResponses = conversationParticipants.stream()
            .map(p -> {
                User user = userRepository.findById(p.getUserId()).orElse(null);
                if (user == null) return null;
                
                ConversationResponse.ParticipantResponse pr = new ConversationResponse.ParticipantResponse();
                pr.setId(user.getId());
                pr.setUsername(user.getUsername());
                pr.setDisplayName(user.getDisplayName());
                pr.setAvatarUrl(user.getAvatarUrl());
                pr.setRole(p.getRole().name().toLowerCase());
                pr.setJoinedAt(p.getJoinedAt());
                pr.setLastSeenAt(p.getLastSeenAt());
                pr.setLastReadMessageId(p.getLastReadMessageId());
                return pr;
            })
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toList());
        
        response.setParticipants(participantResponses);
        
        ConversationParticipant userParticipant = conversationParticipants.stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElse(null);
        
        if (userParticipant != null) {
            response.setMuted(userParticipant.isMuted());
            response.setFavorite(userParticipant.isFavorite());
            response.setUnreadCount((int) userParticipant.getUnreadCount());
        }
        
        // Set name
        if (conversation.getType() == ConversationType.DIRECT) {
            String otherPersonName = participantResponses.stream()
                .filter(p -> !p.getId().equals(userId))
                .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                .findFirst()
                .orElse("Unknown");
            response.setName(otherPersonName);
            String otherAvatar = participantResponses.stream()
                .filter(p -> !p.getId().equals(userId))
                .map(ConversationResponse.ParticipantResponse::getAvatarUrl)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
            response.setAvatarUrl(otherAvatar);
        } else if (conversation.getType() == ConversationType.GROUP) {
            if (conversation.getGroupName() != null && !conversation.getGroupName().trim().isEmpty()) {
                response.setName(conversation.getGroupName());
            } else {
                String membersList = participantResponses.stream()
                    .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getUsername())
                    .collect(Collectors.joining(", "));
                response.setName(membersList.isEmpty() ? "Group Chat" : membersList);
            }
            response.setAvatarUrl(conversation.getGroupAvatarUrl());
        }
        
        if (conversation.getPinnedMessageId() != null) {
            response.setPinnedMessageId(conversation.getPinnedMessageId());
            response.setPinnedAt(conversation.getPinnedAt());
            response.setPinnedByUserId(conversation.getPinnedByUserId());
        }
        
        return response;
    }
}


