package com.example.server.friend.model;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import lombok.Data;

import java.time.Instant;

@Document(collection = "friend_requests")
@CompoundIndexes({
        @CompoundIndex(name = "from_to_unique", def = "{ 'from': 1, 'to': 1 }", unique = true)
})
@Data
public class FriendRequest {
    @Id
    private String id;

    private String from;
    private String to;
    private String message;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}


