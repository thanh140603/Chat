package com.example.server.infrastructure.storage;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
    public String uploadAvatar(MultipartFile file) {
        // Placeholder implementation; integrate Cloudinary/S3 later
        String filename = file != null ? file.getOriginalFilename() : "avatar";
        return "https://files.local/" + (filename == null ? "avatar" : filename);
    }
}


