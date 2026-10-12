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
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
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

    @org.springframework.beans.factory.annotation.Value("${app.otp.expose-in-response:false}")
    private boolean exposeOtpInResponse;

    // Pattern allowing college emails: @anurag.edu.in, @*.edu.in, @*.ac.in, @*.edu,
    // or demo domain @campusgo.com
    private static final Pattern COLLEGE_EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]*\\.(edu|ac\\.in|edu\\.in)|anurag\\.edu\\.in|campusgo\\.com)$",
            Pattern.CASE_INSENSITIVE);

    private boolean isValidCollegeEmail(String email) {
        if (email == null)
            return false;
        return COLLEGE_EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        if (!isValidCollegeEmail(loginRequest.getEmail())) {
            Map<String, Object> err = new HashMap<>();
            err.put("message",
                    "Access restricted. Please use a valid college email address (e.g. rollnumber@anurag.edu.in).");
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
            String rollNumber = email.substring(0, email.indexOf("@"));

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "No approved student account found for roll number " + rollNumber + ". Please contact campus administration.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }

            if (!user.isActive()) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "Your student account is not approved or has been deactivated. Please contact campus administration.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }

            if (!user.hasRole(Role.STUDENT)) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "Google customer login is only available for approved student accounts.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }

            String googleProfileName = googleUser.getName();
            if (googleProfileName != null && !googleProfileName.isBlank()
                    && !googleProfileName.trim().equals(user.getName())) {
                user.setName(googleProfileName.trim());
                user = userRepository.save(user);
                log.info("Updated student profile name from verified Google account for roll number [{}]", rollNumber);
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

        if (!isValidCollegeEmail(email)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Please enter a valid college email address (e.g. 23eg106c27@anurag.edu.in).");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !user.isActive() || !user.hasRole(Role.STUDENT)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "No approved active student account found for this college email.");
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
        } else {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Could not send OTP email. Check MAIL_USERNAME and MAIL_PASSWORD in backend .env. Gmail must use a 16-character app password without spaces.");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String otp = request.getOtp().trim();

        if (!isValidCollegeEmail(email)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Please enter a valid college email address.");
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
    public ResponseEntity<User> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserDetailsImpl userDetails) {
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
