package com.example.server.call.dto;

import com.example.server.call.model.CallStatus;
import com.example.server.call.model.CallType;
import java.time.Instant;

public class CallResponse {
    private String id;
    private String conversationId;
    private String callerId;
    private String callerName;
    private String callerAvatarUrl;
    private String receiverId;
    private String receiverName;
    private String receiverAvatarUrl;
    private CallType type;
    private CallStatus status;
    private Instant startedAt;
    private Instant answeredAt;
    private Instant endedAt;
    private String endedBy;
    private Integer duration;

    public CallResponse() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getCallerId() {
        return callerId;
    }

    public void setCallerId(String callerId) {
        this.callerId = callerId;
    }

    public String getCallerName() {
        return callerName;
    }

    public void setCallerName(String callerName) {
        this.callerName = callerName;
    }

    public String getCallerAvatarUrl() {
        return callerAvatarUrl;
    }

    public void setCallerAvatarUrl(String callerAvatarUrl) {
        this.callerAvatarUrl = callerAvatarUrl;
    }

    public String getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(String receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverAvatarUrl() {
        return receiverAvatarUrl;
    }

    public void setReceiverAvatarUrl(String receiverAvatarUrl) {
        this.receiverAvatarUrl = receiverAvatarUrl;
    }

    public CallType getType() {
        return type;
    }

    public void setType(CallType type) {
        this.type = type;
    }

    public CallStatus getStatus() {
        return status;
    }

    public void setStatus(CallStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(Instant answeredAt) {
        this.answeredAt = answeredAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public String getEndedBy() {
        return endedBy;
    }

    public void setEndedBy(String endedBy) {
        this.endedBy = endedBy;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }
}

