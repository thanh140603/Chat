package com.example.server.user.controller;

import com.example.server.common.security.JwtTokenProvider;
import com.example.server.common.security.SecurityConstants;
import com.example.server.common.util.KongUserExtractor;
import com.example.server.user.dto.AuthRequest;
import com.example.server.user.dto.UserRequest;
import com.example.server.user.dto.UserResponse;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import com.example.server.user.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(UserService userService, UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@Valid @RequestBody UserRequest request) {
        UserResponse userResponse = userService.create(request);
        
        // Generate access token for the new user
        String accessToken = jwtTokenProvider.generateAccessToken(
            userResponse.getUsername(), 
            Map.of("uid", userResponse.getId())
        );
        
        // Return both user info and access token
        return ResponseEntity.ok(Map.of(
            "accessToken", accessToken,
            "user", Map.of(
                "id", userResponse.getId(),
                "username", userResponse.getUsername(),
                "displayName", userResponse.getDisplayName(),
                "email", userResponse.getEmail() != null ? userResponse.getEmail() : "",
                "avatarUrl", userResponse.getAvatarUrl() != null ? userResponse.getAvatarUrl() : "",
                "bio", userResponse.getBio() != null ? userResponse.getBio() : "",
                "phone", userResponse.getPhone() != null ? userResponse.getPhone() : ""
            )
        ));
    }

    @PostMapping("/signin")
    public ResponseEntity<Map<String, String>> signin(@Valid @RequestBody AuthRequest request, HttpServletResponse response) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getHashedPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }
        String access = jwtTokenProvider.generateAccessToken(user.getUsername(), Map.of("uid", user.getId()));
        String refresh = jwtTokenProvider.generateRefreshToken(user.getUsername());
        Cookie cookie = new Cookie(SecurityConstants.REFRESH_COOKIE, refresh);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) Duration.ofDays(30).getSeconds());
        // Allow cookie to be sent in cross-origin requests
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setAttribute("SameSite", "None"); // Allow cross-site cookies
        response.addCookie(cookie);
        
        // TODO: Publish USER_ONLINE event to notify friends
        // kafkaEventPublisher.publishUserEvent("USER_ONLINE", user.getId(), Map.of(
        //     "userId", user.getId(),
        //     "username", user.getUsername(),
        //     "displayName", user.getDisplayName()
        // ));
        
        return ResponseEntity.ok(Map.of("accessToken", access));
    }

    @PostMapping("/signout")
    public void signout(HttpServletResponse response) {
        Cookie cookie = new Cookie(SecurityConstants.REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setAttribute("SameSite", "None"); // Allow cross-site cookies
        response.addCookie(cookie);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@CookieValue(value = SecurityConstants.REFRESH_COOKIE, required = false) String refreshToken, HttpServletRequest request) {
        System.out.println("🔄 Refresh endpoint called");
        System.out.println("🔄 Refresh token from cookie: " + (refreshToken != null ? refreshToken.substring(0, Math.min(20, refreshToken.length())) + "..." : "null"));
        System.out.println("🔄 Request cookies: " + java.util.Arrays.toString(request.getCookies()));
        
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            System.out.println("❌ Refresh token not found in cookie");
            return ResponseEntity.status(401).body(Map.of("error", "Refresh token not found in cookie"));
        }
        try {
            String username = jwtTokenProvider.getSubject(refreshToken);
            System.out.println("🔄 Username from refresh token: " + username);
            return userRepository.findByUsername(username)
                    .map(u -> {
                        String newAccessToken = jwtTokenProvider.generateAccessToken(u.getUsername(), Map.of("uid", u.getId()));
                        System.out.println("✅ New access token generated for user: " + u.getUsername());
                        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
                    })
                    .orElseGet(() -> {
                        System.out.println("❌ User not found: " + username);
                        return ResponseEntity.status(401).body(Map.of("error", "User not found"));
                    });
        } catch (Exception e) {
            System.out.println("❌ Refresh token expired or invalid: " + e.getMessage());
            return ResponseEntity.status(403).body(Map.of("error", "Refresh token expired or invalid"));
        }
    }

    // GET /api/auth/check — get userId from Kong headers (no token verification needed)
    @GetMapping("/check")
    public ResponseEntity<Map<String, String>> check(HttpServletRequest request) {
        KongUserExtractor.KongUserInfo userInfo = new KongUserExtractor().getUserInfo(request);
        
        if (!userInfo.isValid()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
        }
        
        return ResponseEntity.ok(Map.of(
            "userId", userInfo.getUserId(),
            "username", userInfo.getUsername() != null ? userInfo.getUsername() : "unknown"
        ));
    }
}


