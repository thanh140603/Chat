package com.example.server.chat.mapper;

import com.example.server.chat.dto.ConversationRequest;
import com.example.server.chat.dto.ConversationResponse;
import com.example.server.chat.model.Conversation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ConversationMapper {
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "groupCreatedByUserId", ignore = true)
    @Mapping(target = "groupAvatarUrl", ignore = true)
    @Mapping(target = "lastMessageContent", ignore = true)
    @Mapping(target = "lastMessageCreatedAt", ignore = true)
    @Mapping(target = "lastMessageSenderId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Conversation toEntity(ConversationRequest request);
    
    ConversationResponse toResponse(Conversation conversation);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "type", ignore = true)
    @Mapping(target = "groupCreatedByUserId", ignore = true)
    @Mapping(target = "groupAvatarUrl", ignore = true)
    @Mapping(target = "lastMessageContent", ignore = true)
    @Mapping(target = "lastMessageCreatedAt", ignore = true)
    @Mapping(target = "lastMessageSenderId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget Conversation conversation, ConversationRequest request);
}


