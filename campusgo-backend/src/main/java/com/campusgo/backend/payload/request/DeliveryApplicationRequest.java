package com.campusgo.backend.payload.request;

import com.campusgo.backend.models.ApplicantType;
import lombok.Data;

@Data
public class DeliveryApplicationRequest {
    private ApplicantType applicantType;
    private String studentIdCardPath;
    private String timetablePath;
    private String identityDocumentPath;
    private String profilePhotoPath;
    private String studentAvailability;
}
