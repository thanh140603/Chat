package com.example.server.friend.controller;

import com.example.server.common.security.CustomUserDetails;
import com.example.server.friend.dto.FriendRequestDTO;
import com.example.server.friend.dto.FriendRequestsListDTO;
import com.example.server.friend.dto.FriendResponseDTO;
import com.example.server.friend.service.FriendService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@PreAuthorize("isAuthenticated()")
public class FriendController {
    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    // POST /api/friends/requests - Gửi yêu cầu kết bạn
    @PostMapping("/requests")
    public FriendRequestDTO sendFriendRequest(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody FriendRequestDTO request) {
        return friendService.sendFriendRequest(principal.getId(), request);
    }

    // POST /api/friends/requests/:requestId/accept - Đồng ý kết bạn
    @PostMapping("/requests/{requestId}/accept")
    public void acceptFriendRequest(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String requestId) {
        friendService.acceptFriendRequest(principal.getId(), requestId);
    }

    // POST /api/friends/requests/:requestId/decline - Từ chối kết bạn
    @PostMapping("/requests/{requestId}/decline")
    public void declineFriendRequest(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String requestId) {
        friendService.declineFriendRequest(principal.getId(), requestId);
    }

    // GET /api/friends - Lấy danh sách bạn bè
    @GetMapping
    public List<FriendResponseDTO> getFriends(@AuthenticationPrincipal CustomUserDetails principal) {
        return friendService.getFriends(principal.getId());
    }

    // GET /api/friends/requests - Lấy danh sách yêu cầu kết bạn đã gửi và nhận
    @GetMapping("/requests")
    public FriendRequestsListDTO getFriendRequests(@AuthenticationPrincipal CustomUserDetails principal) {
        return friendService.getFriendRequests(principal.getId());
    }
}


