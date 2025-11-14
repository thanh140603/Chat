package com.example.server.chat.controller;

import com.example.server.chat.dto.AddMembersRequest;
import com.example.server.chat.dto.ConversationRequest;
import com.example.server.chat.dto.ConversationResponse;
import com.example.server.chat.dto.ConversationUpdateRequest;
import com.example.server.chat.dto.UpdateParticipantRoleRequest;
import com.example.server.chat.service.ConversationService;
import com.example.server.common.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    public ConversationResponse createConversation(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ConversationRequest request) {
        return conversationService.create(principal.getId(), request);
    }

    @GetMapping
    public List<ConversationResponse> getUserConversations(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return conversationService.getUserConversations(principal.getId());
    }

    @GetMapping("/{id}")
    public ConversationResponse getConversation(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        return conversationService.getById(id);
    }

    @PostMapping("/{id}/members")
    public ConversationResponse addMembers(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @Valid @RequestBody AddMembersRequest request) {
        return conversationService.addMembers(id, principal.getId(), request);
    }

    @PutMapping("/{id}/members/{userId}/role")
    public ConversationResponse updateParticipantRole(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @PathVariable String userId,
            @Valid @RequestBody UpdateParticipantRoleRequest request) {
        return conversationService.updateParticipantRole(id, userId, principal.getId(), request);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public void removeMember(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @PathVariable String userId) {
        conversationService.removeParticipant(id, userId, principal.getId());
    }

    @PutMapping("/{id}")
    public ConversationResponse updateConversation(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @RequestBody ConversationUpdateRequest request) {
        return conversationService.updateConversation(id, principal.getId(), request);
    }
    
    @PostMapping("/{id}/avatar")
    public ConversationResponse updateGroupAvatar(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return conversationService.updateGroupAvatar(id, principal.getId(), file);
    }

    @PostMapping("/{id}/seen")
    public void markAsSeen(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        conversationService.markAsSeen(id, principal.getId());
    }

    @PostMapping("/sample")
    public ConversationResponse createSampleConversation(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return conversationService.createSampleConversation(principal.getId());
    }

    @PutMapping("/{id}/favorite")
    public ConversationResponse toggleFavorite(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        return conversationService.toggleFavorite(id, principal.getId());
    }

    @PutMapping("/{id}/pin/{messageId}")
    public ConversationResponse pinMessage(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @PathVariable String messageId) {
        return conversationService.pinMessage(id, messageId, principal.getId());
    }

    @DeleteMapping("/{id}/pin")
    public ConversationResponse unpinMessage(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        return conversationService.unpinMessage(id, principal.getId());
    }

    @PutMapping("/{id}/mute")
    public ConversationResponse toggleMute(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        return conversationService.toggleMute(id, principal.getId());
    }

    @PostMapping("/direct/{userId}")
    public ConversationResponse ensureDirectConversation(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String userId) {
        return conversationService.ensureDirectBetweenUsers(principal.getId(), userId);
    }
}