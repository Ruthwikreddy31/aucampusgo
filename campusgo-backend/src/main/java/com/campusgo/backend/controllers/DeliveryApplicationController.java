package com.campusgo.backend.controllers;

import com.campusgo.backend.models.ApplicationStatus;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.payload.request.AvailabilityRequest;
import com.campusgo.backend.payload.request.DeliveryApplicationRequest;
import com.campusgo.backend.payload.request.RejectApplicationRequest;
import com.campusgo.backend.payload.response.DeliveryApplicationResponse;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.DeliveryApplicationService;
import com.campusgo.backend.services.DocumentStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery-applications")
@RequiredArgsConstructor
@Slf4j
public class DeliveryApplicationController {

    private final DeliveryApplicationService applicationService;
    private final DocumentStorageService storageService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> submitApplication(
            @RequestBody DeliveryApplicationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        try {
            DeliveryApplicationResponse response = applicationService.submitApplication(user, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-status")
    public ResponseEntity<?> getMyStatus(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        return applicationService.getMyStatus(userDetails.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(null));
    }

    @DeleteMapping("/my-status")
    public ResponseEntity<?> cancelMyApplication(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        try {
            applicationService.cancelMyApplication(userDetails.getId());
            return ResponseEntity.ok(Map.of("message", "Application cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        try {
            String filename = storageService.storeFile(file);
            return ResponseEntity.ok(Map.of(
                    "filename", filename,
                    "url", "/api/delivery-applications/documents/" + filename
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Upload error: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "Could not upload file"));
        }
    }

    @GetMapping("/documents/{filename:.+}")
    public ResponseEntity<?> viewDocument(
            @PathVariable String filename,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        // Check security permission
        if (!applicationService.canUserAccessDocument(user, filename)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access to this document is forbidden"));
        }

        try {
            Resource resource = storageService.loadFileAsResource(filename);
            String contentType = "application/octet-stream";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (lower.endsWith(".png")) {
                contentType = "image/png";
            } else if (lower.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (lower.endsWith(".pdf")) {
                contentType = "application/pdf";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getAllApplications(
            @RequestParam(required = false) ApplicationStatus status,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!user.hasRole(Role.ADMIN) && !user.hasRole(Role.MANAGER) && !user.hasRole(Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        List<DeliveryApplicationResponse> list = applicationService.getAllApplications(status);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/admin/{id}")
    public ResponseEntity<?> getApplicationDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!user.hasRole(Role.ADMIN) && !user.hasRole(Role.MANAGER) && !user.hasRole(Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            DeliveryApplicationResponse res = applicationService.getApplicationById(id);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/admin/{id}/approve")
    public ResponseEntity<?> approveApplication(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User manager = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!manager.hasRole(Role.ADMIN) && !manager.hasRole(Role.MANAGER) && !manager.hasRole(Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            DeliveryApplicationResponse res = applicationService.approveApplication(id, manager);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/admin/{id}/reject")
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody RejectApplicationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User manager = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!manager.hasRole(Role.ADMIN) && !manager.hasRole(Role.MANAGER) && !manager.hasRole(Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            DeliveryApplicationResponse res = applicationService.rejectApplication(id, manager, request.getReason());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/admin/{id}/request-correction")
    public ResponseEntity<?> requestCorrection(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User manager = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!manager.hasRole(Role.ADMIN) && !manager.hasRole(Role.MANAGER) && !manager.hasRole(Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        String message = request.get("message");
        if (message == null || message.trim().isBlank()) {
            message = request.get("reason");
        }

        try {
            DeliveryApplicationResponse res = applicationService.requestCorrection(id, manager, message);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/availability")
    public ResponseEntity<?> updateAvailability(
            @RequestBody AvailabilityRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        try {
            DeliveryApplicationResponse res = applicationService.updateAvailability(userDetails.getId(), request.getAvailability());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
