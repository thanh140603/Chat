package com.example.server.friend.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class FriendRequestDTO {
    private String id;
    
    @NotBlank 
    private String to;
    
    private String from;
    private String message;
    private Instant createdAt;

    public FriendRequestDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}


