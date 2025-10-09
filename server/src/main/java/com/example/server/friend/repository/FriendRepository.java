package com.example.server.friend.repository;

import com.example.server.friend.model.Friend;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FriendRepository extends MongoRepository<Friend, String> {
}


