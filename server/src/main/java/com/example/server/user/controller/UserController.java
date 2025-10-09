package com.example.server.user.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import java.util.Map;

import com.example.server.common.security.JwtTokenProvider;
import com.example.server.common.security.SecurityConstants;
import com.example.server.common.security.CustomUserDetails;
import com.example.server.common.exception.ApiException;
import com.example.server.infrastructure.storage.FileStorageService;
import com.example.server.user.dto.UserRequest;
import com.example.server.user.dto.UserResponse;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import com.example.server.user.service.UserService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()") 
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final FileStorageService fileStorageService;

    public UserController(UserService userService, UserRepository userRepository, JwtTokenProvider jwtTokenProvider, FileStorageService fileStorageService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.fileStorageService = fileStorageService;
    }

    // GET /api/users/me - thông tin người dùng sau khi login
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal CustomUserDetails principal) {
        return userService.getById(principal.getId());
    }

    // GET /api/users/search?username=
    @GetMapping("/search")
    public UserResponse searchByUsername(@AuthenticationPrincipal CustomUserDetails principal, 
                                         @RequestParam("username") String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new ApiException("Username parameter is required");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("User not found"));
        return userService.getById(user.getId());
    }

    // POST /api/users/uploadAvatar (multipart/form-data)
    @PostMapping(value = "/uploadAvatar")
    public Map<String, String> uploadAvatar(@AuthenticationPrincipal CustomUserDetails principal, 
                                            @RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("File is required");
        }
        String url = fileStorageService.uploadAvatar(file);
        return Map.of("avatarUrl", url);
    }

    // PATCH /api/users/me - update profile
    @PatchMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal CustomUserDetails principal,
                                 @Valid @RequestBody UserRequest request) {
        return userService.update(principal.getId(), request);
    }
}


