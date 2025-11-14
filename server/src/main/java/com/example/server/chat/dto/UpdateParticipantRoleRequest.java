package com.example.server.chat.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateParticipantRoleRequest {
    @NotBlank
    private String role; // "admin" or "member"

    public String getRole() {
        return role;
    }
    public void setRole(String role) {
        this.role = role;
    }
}
