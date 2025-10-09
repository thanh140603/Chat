package com.example.server.friend.repository;

import com.example.server.friend.model.Friend;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendRepository extends MongoRepository<Friend, String> {
    
    // Check if two users are friends
    @Query("{ $or: [ { 'userA': ?0, 'userB': ?1 }, { 'userA': ?1, 'userB': ?0 } ] }")
    Optional<Friend> findFriendship(String userA, String userB);
    
    // Check if users are friends (boolean)
    @Query("{ $or: [ { 'userA': ?0, 'userB': ?1 }, { 'userA': ?1, 'userB': ?0 } ] }")
    boolean existsFriendship(String userA, String userB);
    
    // Get all friends of a user
    @Query("{ $or: [ { 'userA': ?0 }, { 'userB': ?0 } ] }")
    List<Friend> findAllFriends(String userId);
    
    // Get friend IDs of a user
    @Query(value = "{ $or: [ { 'userA': ?0 }, { 'userB': ?0 } ] }", fields = "{ 'userA': 1, 'userB': 1 }")
    List<Friend> findFriendIds(String userId);
}


