package com.example.server.infrastructure.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Autowired
    private Cloudinary cloudinary;

    private final Map<String, Integer> filenameCounters = new ConcurrentHashMap<>();

    private String generateUniqueFilename(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "file_" + System.currentTimeMillis();
        }
        String baseName = originalName;
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = originalName.substring(0, dotIndex);
            extension = originalName.substring(dotIndex);
        }
        int counter = filenameCounters.merge(originalName, 1, Integer::sum);
        if (counter == 1) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            return baseName + "_" + timestamp + extension;
        }
        return baseName + "_" + counter + extension;
    }

    public String uploadAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        try {
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "avatars",
                    "resource_type", "image",
                    "transformation", new Transformation()
                        .width(200)
                        .height(200)
                        .crop("fill")
                        .gravity("face")
                )
            );

            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload avatar", e);
        }
    }

    public String uploadGroupAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        try {
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "group_avatars",
                    "resource_type", "image",
                    "transformation", new Transformation()
                        .width(400)
                        .height(400)
                        .crop("fill")
                        .gravity("auto")
                )
            );

            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload group avatar", e);
        }
    }

    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }

        try {
            log.info("Uploading image: name={}, size={}, contentType={}",
                file.getOriginalFilename(), file.getSize(), contentType);

            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "messages/images",
                    "resource_type", "image",
                    "use_filename", true,
                    "unique_filename", true
                )
            );

            String url = (String) uploadResult.get("secure_url");
            log.info("Image uploaded successfully: url={}", url);
            return url;
        } catch (IOException e) {
            log.error("Failed to upload image", e);
            throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to upload image: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Stale request")) {
                log.error("Cloudinary stale request error - check system clock and credentials");
                throw new RuntimeException("Upload failed: System clock may be out of sync or Cloudinary credentials invalid. " + e.getMessage(), e);
            }
            throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        try {
            log.info("Uploading file: name={}, size={}, contentType={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "messages/files",
                    "resource_type", "raw",
                    "type", "upload",
                    "access_mode", "public",
                    "use_filename", true,
                    "unique_filename", false,
                    "overwrite", false,
                    "filename", file.getOriginalFilename(),
                    "original_filename", file.getOriginalFilename()
                )
            );

            if (uploadResult.containsKey("existing")) {
                log.warn("File with same name already exists in Cloudinary. Generating unique name.");
                String newName = generateUniqueFilename(file.getOriginalFilename());
                uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                        "resource_type", "raw",
                        "type", "upload",
                        "access_mode", "public",
                        "use_filename", false,
                        "unique_filename", false,
                        "public_id", "messages/files/" + newName,
                        "overwrite", true,
                        "original_filename", file.getOriginalFilename()
                    )
                );
            }

            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");
            String format = (String) uploadResult.get("format");
            String resourceType = (String) uploadResult.get("resource_type");
            String originalFilename = file.getOriginalFilename();

            // Verify resource_type is "raw"
            if (!"raw".equals(resourceType)) {
                log.warn("Uploaded file has resource_type={}, expected 'raw'. File: {}", resourceType, originalFilename);
            }
            log.info("File uploaded - resource_type={}, public_id={}, secure_url={}", resourceType, publicId, secureUrl);

            String filenameForDownload = originalFilename != null && !originalFilename.isBlank()
                ? originalFilename
                : resolveFilenameFromPublicId(publicId, format);

            String sanitizedFilename = filenameForDownload.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (sanitizedFilename.isBlank()) {
                sanitizedFilename = "download";
            }

            // Generate proper download URL using Cloudinary API to avoid 401 errors
            String downloadUrl = secureUrl;
            if (publicId != null && !publicId.isBlank()) {
                try {
                    downloadUrl = generateDownloadUrlFromCloudinary(publicId, filenameForDownload);
                    log.info("Generated download URL via Cloudinary API: {}", downloadUrl);
                } catch (Exception e) {
                    log.warn("Failed to generate download URL via Cloudinary API, using secure_url: {}", e.getMessage());
                    // Fallback: use secure_url directly
                    // Note: Browser will handle download based on Content-Disposition header from Cloudinary
                    downloadUrl = secureUrl;
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("secureUrl", secureUrl);
            response.put("downloadUrl", downloadUrl);
            response.put("publicId", publicId);
            response.put("originalFilename", filenameForDownload);
            response.put("sanitizedFilename", sanitizedFilename);
            response.put("size", file.getSize());
            response.put("contentType", file.getContentType());

            log.info("File uploaded successfully: url={} downloadUrl={}", secureUrl, downloadUrl);
            return response;
        } catch (IOException e) {
            log.error("Failed to upload file", e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to upload file: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Stale request")) {
                log.error("Cloudinary stale request error - check system clock and credentials");
                throw new RuntimeException("Upload failed: System clock may be out of sync or Cloudinary credentials invalid. " + e.getMessage(), e);
            }
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    private String resolveFilenameFromPublicId(String publicId, String format) {
        if (publicId == null || publicId.isBlank()) {
            return format != null ? "download." + format : "download";
        }
        String base = publicId.substring(publicId.lastIndexOf('/') + 1);
        if (format != null && !format.isBlank()) {
            if (!base.endsWith("." + format)) {
                return base + "." + format;
            }
        }
        return base;
    }

    public String generateDownloadUrlFromUrl(String cloudinaryUrl, String filenameHint) throws IOException {
        try {
            // Extract publicId from Cloudinary URL
            java.net.URL url = new java.net.URL(cloudinaryUrl);
            String path = url.getPath();
            
            // Look for /raw/upload/ or /auto/upload/ pattern
            int uploadIndex = path.indexOf("/raw/upload/");
            if (uploadIndex < 0) {
                uploadIndex = path.indexOf("/auto/upload/");
            }
            
            String publicId = null;
            String format = null;
            
            if (uploadIndex >= 0) {
                // Skip version number (e.g., /v1762955409/)
                int versionStart = uploadIndex + (path.contains("/raw/upload/") ? 12 : 12);
                int versionEnd = path.indexOf('/', versionStart);
                if (versionEnd >= 0) {
                    // Extract everything after version, including folder
                    publicId = path.substring(versionEnd + 1);
                    // Extract format from extension
                    int lastDot = publicId.lastIndexOf('.');
                    if (lastDot > 0) {
                        format = publicId.substring(lastDot + 1);
                        publicId = publicId.substring(0, lastDot);
                    }
                }
            }
            
            if (publicId != null && !publicId.isBlank()) {
                return generateDownloadUrlFromCloudinary(publicId, filenameHint);
            } else {
                // If we can't extract publicId, return original URL
                // Browser will handle download based on Content-Disposition header from Cloudinary
                log.warn("Could not extract publicId from URL, returning original URL: {}", cloudinaryUrl);
                return cloudinaryUrl;
            }
        } catch (Exception e) {
            log.error("Failed to generate download URL from URL: {}", cloudinaryUrl, e);
            throw new IOException("Failed to generate download URL from URL", e);
        }
    }

    public String generateDownloadUrlFromCloudinary(String publicId, String filenameHint) throws IOException {
        try {
            log.info("Generating Cloudinary download URL via Admin API: publicId={}, filenameHint={}", publicId, filenameHint);

            Map<String, Object> params = ObjectUtils.asMap(
                "resource_type", "raw",
                "type", "upload",
                "download_url", true
            );
            Map<String, Object> resource = cloudinary.api().resource(publicId, params);

            String downloadUrl = (String) resource.get("download_url");
            if (downloadUrl == null) {
                // If download_url is not available, use secure_url directly
                // Note: For raw files, download_url may not be available if "Allow delivery of PDF and ZIP files" 
                // is not enabled in Cloudinary Security settings
                String secureUrl = (String) resource.get("secure_url");
                if (secureUrl != null) {
                    log.warn("download_url not available from Cloudinary API. Using secure_url. " +
                        "To enable download URLs, check Cloudinary Security settings: " +
                        "'Allow delivery of PDF and ZIP files' must be enabled.");
                    downloadUrl = secureUrl;
                } else {
                    throw new IOException("No secure_url or download_url returned from Cloudinary");
                }
            } else {
                log.info("Generated signed download URL from Cloudinary API: {}", downloadUrl);
            }

            return downloadUrl;
        } catch (Exception e) {
            log.error("Failed to generate download URL from Cloudinary: publicId={} message={}", publicId, e.getMessage(), e);
            // Try to get secure_url as fallback
            try {
                Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type", "raw",
                    "type", "upload"
                );
                Map<String, Object> resource = cloudinary.api().resource(publicId, params);
                String secureUrl = (String) resource.get("secure_url");
                if (secureUrl != null) {
                    log.warn("Using secure_url as fallback download URL. " +
                        "To enable proper download URLs, check Cloudinary Security settings.");
                    return secureUrl;
                } else {
                    throw new IOException("No secure_url returned from Cloudinary");
                }
            } catch (Exception ex) {
                log.error("Failed to generate fallback download URL: {}", ex.getMessage());
                throw new IOException("Failed to generate download URL from Cloudinary", e);
            }
        }
    }

    public java.io.InputStream downloadFileContent(String publicId) throws IOException {
        try {
            log.info("Downloading file content from Cloudinary: publicId={}", publicId);
            
            // Use Cloudinary Admin API to get file content
            Map<String, Object> params = ObjectUtils.asMap(
                "resource_type", "raw",
                "type", "upload"
            );
            
            // Get resource info first
            Map<String, Object> resource = cloudinary.api().resource(publicId, params);
            String secureUrl = (String) resource.get("secure_url");
            
            if (secureUrl == null) {
                throw new IOException("No secure_url found for publicId: " + publicId);
            }
            
            // Try to download using Cloudinary's signed URL generation
            // Note: This requires "Allow delivery of PDF and ZIP files" to be enabled in Cloudinary Security settings
            try {
                // Generate a signed URL
                String signedUrl = cloudinary.url()
                    .resourceType("raw")
                    .type("upload")
                    .publicId(publicId)
                    .generate();
                
                log.info("Generated signed URL for download: {}", signedUrl);
                
                // Fetch from signed URL
                java.net.URL url = new java.net.URL(signedUrl);
                java.net.HttpURLConnection connection = (java.net.HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(30000);
                // Add User-Agent to avoid blocking
                connection.setRequestProperty("User-Agent", "Mozilla/5.0");
                
                int responseCode = connection.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    log.info("Successfully downloaded file from signed URL");
                    return connection.getInputStream();
                } else {
                    String errorMessage = "HTTP " + responseCode;
                    try {
                        java.io.InputStream errorStream = connection.getErrorStream();
                        if (errorStream != null) {
                            byte[] errorBytes = errorStream.readAllBytes();
                            errorMessage += ": " + new String(errorBytes, java.nio.charset.StandardCharsets.UTF_8);
                        }
                    } catch (Exception ex) {
                        // Ignore error reading error stream
                    }
                    log.error("Failed to download from signed URL: {}", errorMessage);
                    throw new IOException("Failed to download file from Cloudinary: " + errorMessage);
                }
            } catch (IOException e) {
                // Re-throw IOException as-is
                throw e;
            } catch (Exception e) {
                log.error("Failed to download using signed URL, trying direct secure_url: {}", e.getMessage());
                // Fallback: try secure_url directly (may still fail with 401)
                try {
                    java.net.URL url = new java.net.URL(secureUrl);
                    java.net.HttpURLConnection connection = (java.net.HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setConnectTimeout(10000);
                    connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "Mozilla/5.0");
                    
                    int responseCode = connection.getResponseCode();
                    if (responseCode >= 200 && responseCode < 300) {
                        log.info("Successfully downloaded file from secure_url");
                        return connection.getInputStream();
                    } else {
                        throw new IOException("Failed to download file from Cloudinary secure_url: HTTP " + responseCode + 
                            ". Please enable 'Allow delivery of PDF and ZIP files' in Cloudinary Security settings.");
                    }
                } catch (IOException ioException) {
                    throw ioException;
                } catch (Exception ex) {
                    throw new IOException("Failed to download file content: " + ex.getMessage(), ex);
                }
            }
        } catch (Exception e) {
            log.error("Failed to download file content from Cloudinary: publicId={} message={}", publicId, e.getMessage(), e);
            throw new IOException("Failed to download file content from Cloudinary", e);
        }
    }
}
