package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.payload.request.GoogleLoginRequest;
import com.campusgo.backend.payload.request.LoginRequest;
import com.campusgo.backend.payload.request.OtpRequest;
import com.campusgo.backend.payload.request.VerifyOtpRequest;
import com.campusgo.backend.payload.response.JwtResponse;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.security.JwtUtils;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.EmailService;
import com.campusgo.backend.services.GoogleAuthService;
import com.campusgo.backend.services.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final OtpService otpService;
    private final EmailService emailService;
    private final GoogleAuthService googleAuthService;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.otp.expose-in-response:false}")
    private boolean exposeOtpInResponse;

    // Pattern allowing standard valid emails (including college and public domains)
    private static final Pattern VALID_EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            Pattern.CASE_INSENSITIVE);

    private boolean isValidEmail(String email) {
        if (email == null)
            return false;
        return VALID_EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        if (!isValidEmail(loginRequest.getEmail())) {
            Map<String, Object> err = new HashMap<>();
            err.put("message",
                    "Please enter a valid email address.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found"));

        return ResponseEntity.ok(new JwtResponse(jwt, user));
    }

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            GoogleAuthService.GoogleUserInfo googleUser = googleAuthService.verifyAndValidateDomain(request.getIdToken());
            String email = googleUser.getEmail().toLowerCase().trim();
            String rollNumber = email.contains("@") ? email.substring(0, email.indexOf("@")) : email;
            String googleProfileName = googleUser.getName();

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = User.builder()
                        .name(googleProfileName != null && !googleProfileName.isBlank() ? googleProfileName.trim() : "Student (" + rollNumber.toUpperCase() + ")")
                        .email(email)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .roles(new HashSet<>(Set.of(Role.STUDENT)))
                        .active(true)
                        .build();
                user = userRepository.save(user);
                log.info("Auto-registered new student account via Google for email [{}]", email);
            } else if (!user.isActive()) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "Your student account is not approved or has been deactivated. Please contact campus administration.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            } else if (!user.hasRole(Role.STUDENT) && !user.hasRole(Role.DELIVERY_PARTNER)) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "Google sign-in is not enabled for this account.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            } else if (googleProfileName != null && !googleProfileName.isBlank()
                    && !googleProfileName.trim().equals(user.getName())) {
                user.setName(googleProfileName.trim());
                user = userRepository.save(user);
                log.info("Updated profile name from verified Google account for [{}]", email);
            }

            UserDetailsImpl userDetails = UserDetailsImpl.build(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            return ResponseEntity.ok(new JwtResponse(jwt, user));
        } catch (SecurityException e) {
            log.warn("Google authentication rejected: {}", e.getMessage());
            Map<String, Object> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        } catch (Exception e) {
            log.error("Google authentication error", e);
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Failed to authenticate with Google. Please try again.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (!isValidEmail(email)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Please enter a valid email address.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            String rollNumber = email.contains("@") ? email.substring(0, email.indexOf("@")) : email;
            user = User.builder()
                    .name("User (" + rollNumber + ")")
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .roles(new HashSet<>(Set.of(Role.STUDENT)))
                    .active(true)
                    .build();
            user = userRepository.save(user);
            log.info("Auto-registered new user account for email [{}]", email);
        } else if (!user.isActive()) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Your account has been deactivated. Please contact administration.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        String otp = otpService.generateOtp(email);
        boolean emailSent = emailService.sendOtpEmail(email, otp);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("email", email);

        if (emailSent) {
            response.put("message", "OTP sent successfully to " + email);
        } else if (exposeOtpInResponse) {
            response.put("message", "Email delivery unavailable. Use the OTP code shown below.");
            response.put("otp", otp);
            if (emailService.getLastError() != null) {
                response.put("emailError", emailService.getLastError());
            }
        } else {
            Map<String, Object> err = new HashMap<>();
            String detail = emailService.getLastError() != null ? " Reason: " + emailService.getLastError() : "";
            err.put("message", "Could not send OTP email." + detail);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String otp = request.getOtp().trim();

        if (!isValidEmail(email)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Please enter a valid email address.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        boolean isValid = otpService.verifyOtp(email, otp);
        if (!isValid) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Invalid or expired OTP. Please check the code or request a new OTP.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found for email: " + email));

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        return ResponseEntity.ok(new JwtResponse(jwt, user));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        return userRepository.findById(userDetails.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
}
