package com.example.server.message.controller;

import com.example.server.common.security.CustomUserDetails;
import com.example.server.infrastructure.storage.FileStorageService;
import com.example.server.message.dto.ForwardMessageRequest;
import com.example.server.message.dto.MessageRequest;
import com.example.server.message.dto.MessageResponse;
import com.example.server.message.model.Message;
import com.example.server.message.service.MessageService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@PreAuthorize("isAuthenticated()")
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    public MessageController(MessageService messageService, FileStorageService fileStorageService) {
        this.messageService = messageService;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/direct")
    public MessageResponse sendDirect(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody MessageRequest request) {
        if ((request.getContent() == null || request.getContent().isBlank()) &&
            (request.getImgUrl() == null || request.getImgUrl().isBlank())) {
            throw new IllegalArgumentException("Either content or imgUrl is required");
        }
        // For direct, if conversationId null, service should create/find it based on recipientId
        Message saved = messageService.createMessage(
                principal.getId(),
                request.getConversationId(),
                request.getContent(),
                request.getImgUrl(),
                request.getMessageId());
        return toResponse(saved);
    }

    @PostMapping("/group")
    public MessageResponse sendGroup(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody MessageRequest request) {
        if (request.getConversationId() == null || request.getConversationId().isBlank()) {
            throw new IllegalArgumentException("conversationId is required for group message");
        }
        if ((request.getContent() == null || request.getContent().isBlank()) &&
            (request.getImgUrl() == null || request.getImgUrl().isBlank())) {
            throw new IllegalArgumentException("Either content or imgUrl is required");
        }
        Message saved = messageService.createMessage(
                principal.getId(),
                request.getConversationId(),
                request.getContent(),
                request.getImgUrl(),
                request.getMessageId());
        return toResponse(saved);
    }

    @GetMapping("/{conversationId}")
    public List<MessageResponse> list(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Message> messages = messageService.getMessagesByConversation(conversationId, page, size);
        return messages.stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/{conversationId}/search")
    public List<MessageResponse> searchMessages(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String conversationId,
            @RequestParam String query,
            @RequestParam(required = false) String senderId,
            @RequestParam(required = false) java.time.Instant fromDate,
            @RequestParam(required = false) java.time.Instant toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Search query is required");
        }
        List<Message> messages = messageService.searchMessages(conversationId, query, senderId, fromDate, toDate, page, size);
        return messages.stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
    }

    @PutMapping("/{messageId}")
    public MessageResponse update(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String messageId,
            @Valid @RequestBody MessageRequest request) {
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("content is required");
        }
        Message updated = messageService.updateMessage(messageId, principal.getId(), request.getContent());
        return toResponse(updated);
    }

    @DeleteMapping("/{messageId}")
    public void delete(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String messageId) {
        messageService.deleteMessage(messageId, principal.getId());
    }

    @PostMapping("/upload")
    public Map<String, Object> uploadFile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        // Validate file size: Cloudinary free plan limits
        // - Images and raw files: 10MB max
        // - Videos: 100MB max
        long maxSizeBytes = 10 * 1024 * 1024; // 10MB for images and raw files
        String contentType = file.getContentType();
        if (contentType != null && contentType.startsWith("video/")) {
            maxSizeBytes = 100 * 1024 * 1024; // 100MB for videos
        }
        
        if (file.getSize() > maxSizeBytes) {
            String maxSizeMB = maxSizeBytes / (1024 * 1024) + "MB";
            throw new IllegalArgumentException(
                String.format("File size exceeds limit. Maximum allowed: %s (Cloudinary free plan limit)", maxSizeMB)
            );
        }

        try {
            Map<String, Object> result;
            if (contentType != null && contentType.startsWith("image/")) {
                String url = fileStorageService.uploadImage(file);
                result = new HashMap<>();
                result.put("secureUrl", url);
                String filename = file.getOriginalFilename();
                if (filename != null && !filename.isBlank()) {
                    String encoded = java.net.URLEncoder.encode(filename, java.nio.charset.StandardCharsets.UTF_8);
                    result.put("downloadUrl", url + "?attname=" + encoded);
                } else {
                    result.put("downloadUrl", url);
                }
                result.put("originalFilename", file.getOriginalFilename());
                result.put("size", file.getSize());
                result.put("contentType", contentType);
            } else {
                result = fileStorageService.uploadFile(file);
            }

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @PostMapping("/download")
    public ResponseEntity<?> getDownloadUrl(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("url") String fileUrl,
            @RequestParam(value = "publicId", required = false) String publicIdParam) {
        // Legacy fallback for clients that still POST the old route
        return downloadFile(principal, fileUrl, null, publicIdParam, false);
    }

    @GetMapping("/download")
    public ResponseEntity<?> downloadFile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("url") String fileUrl,
            @RequestParam(value = "filename", required = false) String filename,
            @RequestParam(value = "publicId", required = false) String publicIdParam,
            @RequestParam(value = "proxy", defaultValue = "false") boolean proxy) {
        try {
            if (fileUrl == null || fileUrl.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            String decodedUrl = URLDecoder.decode(fileUrl, StandardCharsets.UTF_8);
            String cleanUrl = decodedUrl;
            int queryIndex = cleanUrl.indexOf('?');
            if (queryIndex >= 0) {
                cleanUrl = cleanUrl.substring(0, queryIndex);
            }

            String publicId = publicIdParam;
            if (publicId == null || publicId.isBlank()) {
                try {
                    java.net.URL url = new java.net.URL(cleanUrl);
                    String path = url.getPath();
                    log.info("Extracting publicId from URL path: {}", path);
                    
                    // Look for /raw/upload/ or /auto/upload/ pattern
                    int uploadIndex = path.indexOf("/raw/upload/");
                    if (uploadIndex < 0) {
                        uploadIndex = path.indexOf("/auto/upload/");
                    }
                    
                    if (uploadIndex >= 0) {
                        // Skip version number (e.g., /v1762955409/)
                        int versionStart = uploadIndex + (path.contains("/raw/upload/") ? 12 : 12);
                        int versionEnd = path.indexOf('/', versionStart);
                        if (versionEnd >= 0) {
                            // Extract everything after version, including folder (e.g., "messages/files/IELTS_20251112135007")
                            publicId = path.substring(versionEnd + 1);
                            // Remove file extension if present (Cloudinary public_id doesn't include extension)
                            int lastDot = publicId.lastIndexOf('.');
                            if (lastDot > 0) {
                                publicId = publicId.substring(0, lastDot);
                            }
                        } else {
                            publicId = path.substring(path.lastIndexOf('/') + 1);
                            int lastDot = publicId.lastIndexOf('.');
                            if (lastDot > 0) {
                                publicId = publicId.substring(0, lastDot);
                            }
                        }
                    } else {
                        // Fallback: extract from end of path
                        publicId = path.substring(path.lastIndexOf('/') + 1);
                        int lastDot = publicId.lastIndexOf('.');
                        if (lastDot > 0) {
                            publicId = publicId.substring(0, lastDot);
                        }
                    }
                    log.info("Extracted publicId: {}", publicId);
                } catch (Exception e) {
                    log.warn("Could not extract publicId from URL: {}", cleanUrl, e);
                    publicId = null;
                }
            }

            if (publicId != null && !publicId.isBlank()) {
                publicId = URLDecoder.decode(publicId, StandardCharsets.UTF_8);
                log.info("Decoded publicId: {}", publicId);
            }

            String downloadUrl;
            if (publicId != null && !publicId.isBlank()) {
                try {
                    downloadUrl = fileStorageService.generateDownloadUrlFromCloudinary(publicId, filename);
                } catch (Exception e) {
                    log.warn("Failed to generate download URL via Cloudinary API, trying to generate from URL: {}", e.getMessage());
                    try {
                        // Try to generate download URL from the original URL
                        downloadUrl = fileStorageService.generateDownloadUrlFromUrl(decodedUrl, filename);
                    } catch (Exception ex) {
                        log.warn("Failed to generate download URL from URL, using original URL: {}", ex.getMessage());
                    downloadUrl = decodedUrl;
                    }
                }
            } else {
                // Try to generate download URL from URL even without publicId
                try {
                    downloadUrl = fileStorageService.generateDownloadUrlFromUrl(decodedUrl, filename);
                } catch (Exception e) {
                    log.warn("Failed to generate download URL from URL, using original URL: {}", e.getMessage());
                downloadUrl = decodedUrl;
                }
            }

            if (downloadUrl == null || downloadUrl.isBlank()) {
                log.error("Download URL generation failed for file {}", fileUrl);
                return ResponseEntity.internalServerError().build();
            }

            // If proxy=true, stream the file directly instead of returning URL
            if (proxy) {
                try {
                    // Use Cloudinary SDK to download file content directly
                    if (publicId != null && !publicId.isBlank()) {
                        java.io.InputStream fileInputStream = fileStorageService.downloadFileContent(publicId);
                        
                        // Determine filename
                        String downloadFilename = filename;
                        if (downloadFilename == null || downloadFilename.isBlank()) {
                            // Extract from publicId
                            int lastSlash = publicId.lastIndexOf('/');
                            if (lastSlash >= 0 && lastSlash < publicId.length() - 1) {
                                downloadFilename = publicId.substring(lastSlash + 1);
                            } else {
                                downloadFilename = publicId;
                            }
                            // Remove extension if present (Cloudinary public_id may not include extension)
                            int lastDot = downloadFilename.lastIndexOf('.');
                            if (lastDot > 0) {
                                downloadFilename = downloadFilename.substring(0, lastDot);
                            }
                            downloadFilename = downloadFilename + ".pdf"; // Default to PDF for raw files
                        }
                        
                        // Get content type from original request or default
                        String contentType = "application/pdf"; // Default for raw files
                        
                        org.springframework.core.io.InputStreamResource resource = 
                            new org.springframework.core.io.InputStreamResource(fileInputStream);
                        
                        return ResponseEntity.ok()
                            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, 
                                "attachment; filename=\"" + downloadFilename + "\"")
                            .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                            .body(resource);
                    } else {
                        log.error("Cannot proxy download: publicId is required for direct download");
                        return ResponseEntity.badRequest().build();
                    }
                } catch (Exception e) {
                    log.error("Failed to proxy file download: {}", e.getMessage(), e);
                    return ResponseEntity.internalServerError().build();
                }
            }

            Map<String, String> body = new HashMap<>();
            body.put("downloadUrl", downloadUrl);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("Failed to proxy download from Cloudinary: URL={}", fileUrl, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/forward")
    public List<MessageResponse> forwardMessages(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ForwardMessageRequest request) {
        if (request.getMessageIds() == null || request.getMessageIds().isEmpty()) {
            throw new IllegalArgumentException("At least one message ID is required");
        }
        if (request.getTargetConversationId() == null || request.getTargetConversationId().isBlank()) {
            throw new IllegalArgumentException("Target conversation ID is required");
        }
        
        List<Message> forwardedMessages = messageService.forwardMessages(
            principal.getId(),
            request.getMessageIds(),
            request.getTargetConversationId(),
            request.getComment()
        );
        
        return forwardedMessages.stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
    }

    private MessageResponse toResponse(Message m) {
        MessageResponse r = new MessageResponse();
        r.setId(m.getId());
        r.setSenderId(m.getSenderId());
        r.setConversationId(m.getConversationId());
        r.setContent(m.getContent());
        r.setImageUrl(m.getImageUrl());
        r.setCreatedAt(m.getCreatedAt());
        // Set originalCreatedAt: use stored value, or fallback to createdAt if null (for old messages)
        if (m.getOriginalCreatedAt() != null) {
            r.setOriginalCreatedAt(m.getOriginalCreatedAt());
        } else {
            // For old messages without originalCreatedAt, use createdAt as fallback
            r.setOriginalCreatedAt(m.getCreatedAt());
        }
        if (m.getUpdatedAt() != null) {
            r.setUpdatedAt(m.getUpdatedAt());
        }
        
        // Set forwarding information
        if (m.getForwardedFromMessageId() != null) {
            r.setForwardedFromMessageId(m.getForwardedFromMessageId());
            r.setForwardedFromConversationId(m.getForwardedFromConversationId());
            r.setForwardedFromSenderId(m.getForwardedFromSenderId());
            r.setForwardedFromSenderName(m.getForwardedFromSenderName());
            r.setForwardedAt(m.getForwardedAt());
        }
        
        return r;
    }
}


