package com.example.server.user.controller;

import com.example.server.common.security.JwtTokenProvider;
import com.example.server.common.security.SecurityConstants;
import com.example.server.user.dto.AuthRequest;
import com.example.server.user.dto.UserRequest;
import com.example.server.user.dto.UserResponse;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import com.example.server.user.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    public UserResponse signup(@Valid @RequestBody UserRequest request) {
        return userService.create(request);
    }

    @PostMapping("/signin")
    public ResponseEntity<Map<String, String>> signin(@Valid @RequestBody AuthRequest request, HttpServletResponse response) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getHashedPassword())) {
            return ResponseEntity.status(401).build();
        }
        String access = jwtTokenProvider.generateAccessToken(user.getUsername(), Map.of("uid", user.getId()));
        String refresh = jwtTokenProvider.generateRefreshToken(user.getUsername());
        Cookie cookie = new Cookie(SecurityConstants.REFRESH_COOKIE, refresh);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) Duration.ofDays(30).getSeconds());
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("accessToken", access));
    }

    @PostMapping("/signout")
    public void signout(HttpServletResponse response) {
        Cookie cookie = new Cookie(SecurityConstants.REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@CookieValue(value = SecurityConstants.REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken == null) return ResponseEntity.status(401).build();
        try {
            String username = jwtTokenProvider.getSubject(refreshToken);
            return userRepository.findByUsername(username)
                    .map(u -> ResponseEntity.ok(Map.of(
                            "accessToken", jwtTokenProvider.generateAccessToken(u.getUsername(), Map.of("uid", u.getId()))
                    )))
                    .orElseGet(() -> ResponseEntity.status(401).build());
        } catch (Exception e) {
            return ResponseEntity.status(403).build();
        }
    }

    // GET /api/auth/check — verify access token and return userId
    @GetMapping("/check")
    public ResponseEntity<Map<String, String>> check(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        return userRepository.findByUsername(principal.getUsername())
                .map(u -> ResponseEntity.ok(Map.of("userId", u.getId())))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}


