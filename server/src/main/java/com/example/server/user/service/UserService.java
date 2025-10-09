package com.example.server.user.service;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

import com.example.server.common.exception.ApiException;
import com.example.server.user.dto.UserRequest;
import com.example.server.user.dto.UserResponse;
import com.example.server.user.mapper.UserMapper;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ApiException("Username already exists");
        }
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email already exists");
        }
        User user = userMapper.toEntity(request);
        user.setHashedPassword(passwordEncoder.encode(request.getPassword()));
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    public UserResponse getById(String id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ApiException("User not found"));
        return userMapper.toResponse(user);
    }

    public List<UserResponse> list() {
        return userRepository.findAll().stream().map(userMapper::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public UserResponse update(String id, UserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new ApiException("User not found"));
        // protect username changes and password hashing in mapper; we handle password here if provided
        userMapper.updateEntity(user, request);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setHashedPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new ApiException("Email already exists");
            }
        }
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Transactional
    public void delete(String id) {
        if (!userRepository.existsById(id)) {
            throw new ApiException("User not found");
        }
        userRepository.deleteById(id);
    }
}


