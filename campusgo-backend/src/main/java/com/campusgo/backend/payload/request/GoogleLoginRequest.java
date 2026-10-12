package com.campusgo.backend.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLoginRequest {
    @NotBlank(message = "Google ID token is required")
    @Size(max = 12000, message = "Google token is too large. Please sign in again.")
    private String idToken;
}
