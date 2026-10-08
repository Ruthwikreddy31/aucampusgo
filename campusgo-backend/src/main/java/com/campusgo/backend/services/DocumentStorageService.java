package com.campusgo.backend.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class DocumentStorageService {

    private final Path storageLocation = Paths.get("uploads", "delivery_documents").toAbsolutePath().normalize();

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".pdf", ".webp");
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final byte[] ENCRYPTION_MARKER = "CGENC1".getBytes();
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private final SecretKeySpec storageKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public DocumentStorageService(@Value("${app.documents.encryption-key:${app.jwt.secret}}") String encryptionKey) {
        this.storageKey = new SecretKeySpec(sha256(encryptionKey), "AES");
        try {
            Files.createDirectories(this.storageLocation);
        } catch (IOException e) {
            log.error("Could not create directory for document storage: {}", e.getMessage());
            throw new RuntimeException("Could not initialize document storage", e);
        }
    }

    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            originalFilename = "document.jpg";
        }

        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = originalFilename.substring(dotIdx).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File type " + extension + " is not allowed. Only JPG, PNG, WEBP, and PDF are supported.");
        }

        String storedFilename = UUID.randomUUID().toString() + extension;

        try {
            Path targetLocation = this.storageLocation.resolve(storedFilename);
            Files.write(targetLocation, encrypt(file.getBytes()), StandardOpenOption.CREATE_NEW);
            return storedFilename;
        } catch (IOException e) {
            log.error("Failed to store file {}: {}", storedFilename, e.getMessage());
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public Resource loadFileAsResource(String filename) {
        try {
            Path filePath = this.storageLocation.resolve(filename).normalize();
            if (!filePath.startsWith(this.storageLocation)) {
                throw new SecurityException("Access to path outside storage is forbidden");
            }
            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                throw new RuntimeException("File not found or not readable: " + filename);
            }
            byte[] storedBytes = Files.readAllBytes(filePath);
            if (isEncrypted(storedBytes)) {
                byte[] plainBytes = decrypt(storedBytes);
                return new ByteArrayResource(plainBytes) {
                    @Override
                    public String getFilename() {
                        return filename;
                    }
                };
            }
            return new UrlResource(filePath.toUri());
        } catch (Exception e) {
            throw new RuntimeException("Error reading file: " + filename, e);
        }
    }

    private byte[] encrypt(byte[] plainBytes) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, storageKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(plainBytes);
            byte[] result = new byte[ENCRYPTION_MARKER.length + iv.length + cipherText.length];
            System.arraycopy(ENCRYPTION_MARKER, 0, result, 0, ENCRYPTION_MARKER.length);
            System.arraycopy(iv, 0, result, ENCRYPTION_MARKER.length, iv.length);
            System.arraycopy(cipherText, 0, result, ENCRYPTION_MARKER.length + iv.length, cipherText.length);
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt file", e);
        }
    }

    private byte[] decrypt(byte[] storedBytes) {
        try {
            byte[] iv = Arrays.copyOfRange(storedBytes, ENCRYPTION_MARKER.length, ENCRYPTION_MARKER.length + GCM_IV_LENGTH);
            byte[] cipherText = Arrays.copyOfRange(storedBytes, ENCRYPTION_MARKER.length + GCM_IV_LENGTH, storedBytes.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, storageKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            return cipher.doFinal(cipherText);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt file", e);
        }
    }

    private boolean isEncrypted(byte[] storedBytes) {
        if (storedBytes.length < ENCRYPTION_MARKER.length + GCM_IV_LENGTH) {
            return false;
        }
        for (int i = 0; i < ENCRYPTION_MARKER.length; i++) {
            if (storedBytes[i] != ENCRYPTION_MARKER[i]) {
                return false;
            }
        }
        return true;
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes());
        } catch (Exception e) {
            throw new RuntimeException("Could not initialize document encryption key", e);
        }
    }
}
