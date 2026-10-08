package com.campusgo.backend.payload.response;

import com.campusgo.backend.models.ApplicantType;
import com.campusgo.backend.models.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DeliveryApplicationResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private ApplicantType applicantType;
    private ApplicationStatus status;
    private String studentIdCardPath;
    private String timetablePath;
    private String identityDocumentPath;
    private String profilePhotoPath;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewedByName;
    private String rejectionReason;
    private String correctionMessage;
    private Long previousApplicationId;
    private String studentAvailability;
}
