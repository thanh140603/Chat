package com.example.websocket.friend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class FriendApiClient {

    private static final Logger log = LoggerFactory.getLogger(FriendApiClient.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String friendsEndpoint;

    public FriendApiClient(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.gateway.base-url:http://chatapp-kong:8000}") String baseUrl) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
        this.objectMapper = objectMapper;
        this.friendsEndpoint = "/api/friends";
    }

    /**
     * Get friend list from server API
     */
    public List<FriendInfo> getFriends(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return Collections.emptyList();
        }

        try {
            Mono<String> responseMono = webClient.get()
                    .uri(friendsEndpoint)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .bodyToMono(String.class);

            String responseBody = responseMono.block(java.time.Duration.ofSeconds(5));

            if (responseBody == null) {
                log.warn("Failed to fetch friends: empty body");
                return Collections.emptyList();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            if (!root.isArray()) {
                log.warn("Unexpected friends response: {}", responseBody);
                return Collections.emptyList();
            }

            List<FriendInfo> friends = new ArrayList<>();
            for (JsonNode node : root) {
                String id = text(node, "id");
                if (id == null) {
                    continue;
                }
                friends.add(new FriendInfo(
                        id,
                        text(node, "username"),
                        text(node, "displayName"),
                        text(node, "avatarUrl")
                ));
            }
            return friends;
        } catch (Exception ex) {
            log.error("Failed to fetch friends", ex);
            return Collections.emptyList();
        }
    }

    /**
     * Extract text value from JsonNode
     */
    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text != null && !text.isBlank() ? text : null;
    }

    public record FriendInfo(String id, String username, String displayName, String avatarUrl) {}
}


