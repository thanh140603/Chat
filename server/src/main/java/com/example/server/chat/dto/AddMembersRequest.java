package com.example.server.chat.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class AddMembersRequest {
    @NotEmpty
    private List<String> memberIds; // List of user IDs to add

    public List<String> getMemberIds() {
        return memberIds;
    }
    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds;
    }
}
