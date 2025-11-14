package com.example.server.friend.repository;

import com.example.server.friend.model.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {
    
    // Check if friend request exists between two users
    @Query("{ $or: [ { 'from': ?0, 'to': ?1 }, { 'from': ?1, 'to': ?0 } ] }")
    Optional<FriendRequest> findRequestBetweenUsers(String userA, String userB);
    
    // Check if friend request exists (boolean) — existence projection
    @Query(value = "{ $or: [ { 'from': ?0, 'to': ?1 }, { 'from': ?1, 'to': ?0 } ] }", exists = true)
    boolean existsRequestBetweenUsers(String userA, String userB);
    
    // Get all sent requests by a user
    @Query("{ 'from': ?0 }")
    List<FriendRequest> findSentRequests(String userId);
    
    // Get all received requests by a user
    @Query("{ 'to': ?0 }")
    List<FriendRequest> findReceivedRequests(String userId);
    
    // Get all requests (sent and received) by a user
    @Query("{ $or: [ { 'from': ?0 }, { 'to': ?0 } ] }")
    List<FriendRequest> findAllRequests(String userId);
}


