package com.example.server.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class ConversationRequest {
    @NotBlank
    private String type; // "DIRECT" or "GROUP"
    
    private String groupName; // Only for GROUP type
    
    @NotEmpty
    private List<String> memberIds; // List of user IDs to add as participants

    public String getType() {
        return type;
    }
    public void setType(String type) {
        this.type = type;
    }
    public String getGroupName() {
        return groupName;
    }
    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }
    public List<String> getMemberIds() {
        return memberIds;
    }
    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds;
    }
}


