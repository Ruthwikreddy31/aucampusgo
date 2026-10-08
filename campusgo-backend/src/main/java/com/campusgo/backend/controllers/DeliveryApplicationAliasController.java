package com.campusgo.backend.controllers;

import com.campusgo.backend.models.ApplicationStatus;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.payload.request.DeliveryApplicationRequest;
import com.campusgo.backend.payload.request.RejectApplicationRequest;
import com.campusgo.backend.payload.response.DeliveryApplicationResponse;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.DeliveryApplicationService;
import com.campusgo.backend.services.DocumentStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DeliveryApplicationAliasController {

    private final DeliveryApplicationService applicationService;
    private final DocumentStorageService storageService;
    private final UserRepository userRepository;

    private boolean canReview(User user) {
        return user.hasRole(Role.ADMIN) || user.hasRole(Role.MANAGER) || user.hasRole(Role.CANTEEN_MEMBER);
    }

    @PostMapping("/api/delivery-partner/applications")
    public ResponseEntity<?> submitApplication(
            @RequestBody DeliveryApplicationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        try {
            return ResponseEntity.ok(applicationService.submitApplication(user, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/api/delivery-partner/application")
    public ResponseEntity<?> getMyStatus(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        return applicationService.getMyStatus(userDetails.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(null));
    }

    @PostMapping("/api/delivery-partner/documents")
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
            return ResponseEntity.internalServerError().body(Map.of("message", "Could not upload file"));
        }
    }

    @GetMapping("/api/admin/delivery-partner/applications")
    public ResponseEntity<?> getAllApplications(
            @RequestParam(required = false) ApplicationStatus status,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!canReview(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        List<DeliveryApplicationResponse> list = applicationService.getAllApplications(status);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/api/admin/delivery-partner/applications/{id}")
    public ResponseEntity<?> getApplicationDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!canReview(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            return ResponseEntity.ok(applicationService.getApplicationById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/api/admin/delivery-partner/applications/{id}/approve")
    public ResponseEntity<?> approveApplication(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User reviewer = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!canReview(reviewer)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            return ResponseEntity.ok(applicationService.approveApplication(id, reviewer));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/admin/delivery-partner/applications/{id}/reject")
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody RejectApplicationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User reviewer = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!canReview(reviewer)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin or Manager access required"));
        }

        try {
            return ResponseEntity.ok(applicationService.rejectApplication(id, reviewer, request.getReason()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
