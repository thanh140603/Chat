package com.example.server.friend.model;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import lombok.Data;

import java.time.Instant;

@Document(collection = "friends")
@CompoundIndexes({
        @CompoundIndex(name = "userA_userB_unique", def = "{ 'userA': 1, 'userB': 1 }", unique = true),
        @CompoundIndex(name = "userB_userA_idx", def = "{ 'userB': 1, 'userA': 1 }")
})
@Data
public class Friend {
    @Id
    private String id;

    private String userA;
    private String userB;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}


