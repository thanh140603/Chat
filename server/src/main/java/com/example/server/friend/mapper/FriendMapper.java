package com.example.server.friend.mapper;

import com.example.server.friend.dto.FriendRequestDTO;
import com.example.server.friend.dto.FriendResponseDTO;
import com.example.server.friend.model.Friend;
import com.example.server.friend.model.FriendRequest;
import com.example.server.user.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FriendMapper {
    
    // Convert FriendRequestDTO to FriendRequest entity (for creating)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "from", ignore = true) // Will be set in service
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    FriendRequest toEntity(FriendRequestDTO dto);
    
    // Convert FriendRequest entity to FriendRequestDTO (for response)
    FriendRequestDTO toDTO(FriendRequest entity);
    
    // Convert User to FriendResponseDTO
    FriendResponseDTO userToFriendResponse(User user);
}


