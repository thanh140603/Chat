package com.example.server.friend.dto;

import java.util.List;

public class FriendRequestsListDTO {
    private List<FriendRequestDTO> sent;
    private List<FriendRequestDTO> received;

    public FriendRequestsListDTO() {}

    public FriendRequestsListDTO(List<FriendRequestDTO> sent, List<FriendRequestDTO> received) {
        this.sent = sent;
        this.received = received;
    }

    public List<FriendRequestDTO> getSent() { return sent; }
    public void setSent(List<FriendRequestDTO> sent) { this.sent = sent; }
    public List<FriendRequestDTO> getReceived() { return received; }
    public void setReceived(List<FriendRequestDTO> received) { this.received = received; }
}
