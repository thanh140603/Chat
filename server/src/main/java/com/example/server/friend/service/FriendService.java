package com.example.server.friend.service;

import com.example.server.common.exception.ApiException;
import com.example.server.friend.dto.FriendRequestDTO;
import com.example.server.friend.dto.FriendRequestsListDTO;
import com.example.server.friend.dto.FriendResponseDTO;
import com.example.server.friend.mapper.FriendMapper;
import com.example.server.friend.model.Friend;
import com.example.server.friend.model.FriendRequest;
import com.example.server.friend.repository.FriendRepository;
import com.example.server.friend.repository.FriendRequestRepository;
import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendService {
    private final FriendRepository friendRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final FriendMapper friendMapper;

    public FriendService(FriendRepository friendRepository, 
                        FriendRequestRepository friendRequestRepository,
                        UserRepository userRepository,
                        FriendMapper friendMapper) {
        this.friendRepository = friendRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
        this.friendMapper = friendMapper;
    }

    @Transactional
    public FriendRequestDTO sendFriendRequest(String fromUserId, FriendRequestDTO request) {
        // Check if target user exists
        User targetUser = userRepository.findById(request.getTo())
                .orElseThrow(() -> new ApiException("User not found"));

        // Check if users are already friends
        if (friendRepository.existsFriendship(fromUserId, request.getTo())) {
            throw new ApiException("Already friends");
        }

        // Check if friend request already exists
        if (friendRequestRepository.existsRequestBetweenUsers(fromUserId, request.getTo())) {
            throw new ApiException("Friend request already sent");
        }

        // Create friend request
        FriendRequest friendRequest = friendMapper.toEntity(request);
        friendRequest.setFrom(fromUserId);
        FriendRequest saved = friendRequestRepository.save(friendRequest);

        // Return the created friend request
        return friendMapper.toDTO(saved);
    }

    @Transactional
    public void acceptFriendRequest(String userId, String requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException("Friend request not found"));

        // Check if user is the recipient
        if (!request.getTo().equals(userId)) {
            throw new ApiException("Unauthorized to accept this request");
        }

        // Create friendship
        Friend friendship = new Friend();
        friendship.setUserA(request.getFrom());
        friendship.setUserB(request.getTo());
        friendRepository.save(friendship);

        // Delete the friend request
        friendRequestRepository.deleteById(requestId);
    }

    @Transactional
    public void declineFriendRequest(String userId, String requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException("Friend request not found"));

        // Check if user is the recipient
        if (!request.getTo().equals(userId)) {
            throw new ApiException("Unauthorized to decline this request");
        }

        // Delete the friend request
        friendRequestRepository.deleteById(requestId);
    }

    public List<FriendResponseDTO> getFriends(String userId) {
        List<Friend> friendships = friendRepository.findAllFriends(userId);
        
        return friendships.stream()
                .map(friendship -> {
                    // Get the other user (not the current user)
                    String otherUserId = friendship.getUserA().equals(userId) 
                            ? friendship.getUserB() 
                            : friendship.getUserA();
                    
                    User otherUser = userRepository.findById(otherUserId)
                            .orElseThrow(() -> new ApiException("User not found"));
                    
                    return friendMapper.userToFriendResponse(otherUser);
                })
                .collect(Collectors.toList());
    }

    public FriendRequestsListDTO getFriendRequests(String userId) {
        List<FriendRequest> sentRequests = friendRequestRepository.findSentRequests(userId);
        List<FriendRequest> receivedRequests = friendRequestRepository.findReceivedRequests(userId);

        List<FriendRequestDTO> sentDTOs = sentRequests.stream()
                .map(friendMapper::toDTO)
                .collect(Collectors.toList());

        List<FriendRequestDTO> receivedDTOs = receivedRequests.stream()
                .map(friendMapper::toDTO)
                .collect(Collectors.toList());

        return new FriendRequestsListDTO(sentDTOs, receivedDTOs);
    }

}


