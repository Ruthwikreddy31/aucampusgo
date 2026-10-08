package com.campusgo.backend.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyOtpRequest {

    @NotBlank(message = "College email is required")
    private String email;

    @NotBlank(message = "OTP is required")
    private String otp;
}
