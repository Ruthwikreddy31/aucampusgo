package com.campusgo.backend.services;

import com.campusgo.backend.models.*;
import com.campusgo.backend.payload.request.DeliveryApplicationRequest;
import com.campusgo.backend.payload.response.DeliveryApplicationResponse;
import com.campusgo.backend.repositories.DeliveryAgentRepository;
import com.campusgo.backend.repositories.DeliveryApplicationRepository;
import com.campusgo.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryApplicationService {

    private final DeliveryApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;

    @Transactional
    public DeliveryApplicationResponse submitApplication(User user, DeliveryApplicationRequest request) {
        if (request.getApplicantType() == ApplicantType.STUDENT && !user.hasRole(Role.STUDENT)) {
            user.addRole(Role.STUDENT);
            userRepository.save(user);
        }
        if (request.getApplicantType() == ApplicantType.WORKER && !user.hasRole(Role.CANTEEN_MEMBER)) {
            user.addRole(Role.CANTEEN_MEMBER);
            userRepository.save(user);
        }

        // Validate required documents according to applicant type
        if (request.getApplicantType() == ApplicantType.STUDENT) {
            if (request.getStudentIdCardPath() == null || request.getStudentIdCardPath().isBlank()) {
                throw new IllegalArgumentException("Student ID Card is required");
            }
            if (request.getTimetablePath() == null || request.getTimetablePath().isBlank()) {
                throw new IllegalArgumentException("Timetable is required");
            }
        } else if (request.getApplicantType() == ApplicantType.WORKER) {
            if (request.getIdentityDocumentPath() == null || request.getIdentityDocumentPath().isBlank()) {
                throw new IllegalArgumentException("Identity verification document (Aadhaar / Staff ID) is required");
            }
        }

        if (request.getProfilePhotoPath() == null || request.getProfilePhotoPath().isBlank()) {
            throw new IllegalArgumentException("Personal profile photo is required");
        }

        // Check if user already has an active pending or approved application
        Optional<DeliveryPartnerApplication> existing = applicationRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (existing.isPresent()) {
            DeliveryPartnerApplication prev = existing.get();
            if (prev.getStatus() == ApplicationStatus.APPROVED) {
                return mapToResponse(prev);
            }
            if (prev.getStatus() == ApplicationStatus.PENDING || prev.getStatus() == ApplicationStatus.UNDER_REVIEW) {
                // Update documents on the pending application
                prev.setApplicantType(request.getApplicantType());
                prev.setStudentIdCardPath(request.getStudentIdCardPath());
                prev.setTimetablePath(request.getTimetablePath());
                prev.setIdentityDocumentPath(request.getIdentityDocumentPath());
                prev.setProfilePhotoPath(request.getProfilePhotoPath());
                prev.setStudentAvailability(request.getStudentAvailability());
                prev.setSubmittedAt(LocalDateTime.now());
                DeliveryPartnerApplication saved = applicationRepository.save(prev);
                return mapToResponse(saved);
            }
        }

        // Create new application
        DeliveryPartnerApplication application = DeliveryPartnerApplication.builder()
                .user(user)
                .applicantType(request.getApplicantType())
                .status(ApplicationStatus.PENDING)
                .studentIdCardPath(request.getStudentIdCardPath())
                .timetablePath(request.getTimetablePath())
                .identityDocumentPath(request.getIdentityDocumentPath())
                .profilePhotoPath(request.getProfilePhotoPath())
                .studentAvailability(request.getStudentAvailability())
                .submittedAt(LocalDateTime.now())
                .build();

        DeliveryPartnerApplication saved = applicationRepository.save(application);
        log.info("New delivery partner application submitted by user ID: {}", user.getId());
        return mapToResponse(saved);
    }

    public Optional<DeliveryApplicationResponse> getMyStatus(Long userId) {
        return applicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(this::mapToResponse);
    }

    public List<DeliveryApplicationResponse> getAllApplications(ApplicationStatus status) {
        List<DeliveryPartnerApplication> list;
        if (status != null) {
            list = applicationRepository.findByStatusOrderBySubmittedAtDesc(status);
        } else {
            list = applicationRepository.findAllByOrderBySubmittedAtDesc();
        }
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public DeliveryApplicationResponse getApplicationById(Long id) {
        DeliveryPartnerApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + id));
        return mapToResponse(app);
    }

    @Transactional
    public DeliveryApplicationResponse approveApplication(Long applicationId, User manager) {
        DeliveryPartnerApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        app.setStatus(ApplicationStatus.APPROVED);
        app.setReviewedAt(LocalDateTime.now());
        app.setReviewedBy(manager);
        app.setRejectionReason(null);
        DeliveryPartnerApplication saved = applicationRepository.save(app);

        // Approval grants delivery capability without replacing the user's base role.
        User applicant = app.getUser();
        applicant.addRole(Role.DELIVERY_PARTNER);
        userRepository.save(applicant);

        // Ensure DeliveryAgent entry exists in delivery_agents table
        if (deliveryAgentRepository.findByUserId(applicant.getId()).isEmpty()) {
            DeliveryAgent agent = DeliveryAgent.builder()
                    .user(applicant)
                    .availabilityStatus("AVAILABLE")
                    .build();
            deliveryAgentRepository.save(agent);
        }

        log.info("Delivery partner application approved for user ID: {} by manager ID: {}", applicant.getId(), manager.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public DeliveryApplicationResponse rejectApplication(Long applicationId, User manager, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Rejection reason is mandatory");
        }

        DeliveryPartnerApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        app.setStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(reason.trim());
        app.setReviewedAt(LocalDateTime.now());
        app.setReviewedBy(manager);
        DeliveryPartnerApplication saved = applicationRepository.save(app);

        log.info("Delivery partner application rejected for user ID: {} by manager ID: {}", app.getUser().getId(), manager.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public DeliveryApplicationResponse requestCorrection(Long applicationId, User manager, String message) {
        if (message == null || message.trim().isBlank()) {
            throw new IllegalArgumentException("Correction message is mandatory");
        }

        DeliveryPartnerApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        app.setStatus(ApplicationStatus.NEEDS_CORRECTION);
        app.setCorrectionMessage(message.trim());
        app.setReviewedAt(LocalDateTime.now());
        app.setReviewedBy(manager);
        DeliveryPartnerApplication saved = applicationRepository.save(app);

        log.info("Delivery partner application correction requested for user ID: {} by manager ID: {}", app.getUser().getId(), manager.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public DeliveryApplicationResponse updateAvailability(Long userId, String availability) {
        DeliveryPartnerApplication app = applicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found for user ID: " + userId));

        app.setStudentAvailability(availability);
        DeliveryPartnerApplication saved = applicationRepository.save(app);
        return mapToResponse(saved);
    }

    @Transactional
    public void cancelMyApplication(Long userId) {
        List<DeliveryPartnerApplication> list = applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (DeliveryPartnerApplication app : list) {
            if (app.getStatus() != ApplicationStatus.APPROVED) {
                applicationRepository.delete(app);
                log.info("Cancelled application ID: {} for user ID: {}", app.getId(), userId);
            }
        }
    }

    public DeliveryPartnerApplication getEntityById(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + id));
    }

    public boolean canUserAccessDocument(User user, String filename) {
        if (user.hasRole(Role.ADMIN)) {
            return true;
        }
        // Check if filename belongs to user's application
        Optional<DeliveryPartnerApplication> appOpt = applicationRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (appOpt.isEmpty()) {
            return false;
        }
        DeliveryPartnerApplication app = appOpt.get();
        if (filename.equals(app.getIdentityDocumentPath())) {
            return false;
        }
        return filename.equals(app.getStudentIdCardPath()) ||
               filename.equals(app.getTimetablePath()) ||
               filename.equals(app.getProfilePhotoPath());
    }

    public DeliveryApplicationResponse mapToResponse(DeliveryPartnerApplication app) {
        return DeliveryApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUser().getId())
                .userName(app.getUser().getName())
                .userEmail(app.getUser().getEmail())
                .userPhone(app.getUser().getPhone())
                .applicantType(app.getApplicantType())
                .status(app.getStatus())
                .studentIdCardPath(app.getStudentIdCardPath())
                .timetablePath(app.getTimetablePath())
                .identityDocumentPath(app.getIdentityDocumentPath())
                .profilePhotoPath(app.getProfilePhotoPath())
                .submittedAt(app.getSubmittedAt())
                .reviewedAt(app.getReviewedAt())
                .reviewedByName(app.getReviewedBy() != null ? app.getReviewedBy().getName() : null)
                .rejectionReason(app.getRejectionReason())
                .correctionMessage(app.getCorrectionMessage())
                .previousApplicationId(app.getPreviousApplicationId())
                .studentAvailability(app.getStudentAvailability())
                .build();
    }
}
