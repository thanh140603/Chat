package com.example.server.call.controller;

import com.example.server.call.dto.CallResponse;
import com.example.server.call.dto.InitiateCallRequest;
import com.example.server.call.service.CallService;
import com.example.server.common.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class CallController {
    
    private final CallService callService;
    
    @PostMapping("/initiate")
    public CallResponse initiateCall(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody InitiateCallRequest request) {
        return callService.initiateCall(principal.getId(), request);
    }
    
    @PostMapping("/{callId}/answer")
    public CallResponse answerCall(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String callId) {
        return callService.answerCall(callId, principal.getId());
    }
    
    @PostMapping("/{callId}/reject")
    public CallResponse rejectCall(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String callId) {
        return callService.rejectCall(callId, principal.getId());
    }
    
    @PostMapping("/{callId}/end")
    public CallResponse endCall(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String callId) {
        return callService.endCall(callId, principal.getId());
    }
    
    @GetMapping("/history")
    public Page<CallResponse> getCallHistory(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return callService.getCallHistory(principal.getId(), conversationId, page, size);
    }
    
    @GetMapping("/active")
    public List<CallResponse> getActiveCalls(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return callService.getActiveCalls(principal.getId());
    }
    
    @GetMapping("/{callId}")
    public CallResponse getCallById(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String callId) {
        return callService.getCallById(callId, principal.getId());
    }
}

