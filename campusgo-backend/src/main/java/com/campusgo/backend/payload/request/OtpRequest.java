package com.campusgo.backend.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OtpRequest {

    @NotBlank(message = "College email is required")
    @Email(message = "Valid college email is required")
    @Size(max = 120)
    private String email;
}
