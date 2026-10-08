package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.payload.request.LoginRequest;
import com.campusgo.backend.payload.request.OtpRequest;
import com.campusgo.backend.payload.request.VerifyOtpRequest;
import com.campusgo.backend.payload.response.JwtResponse;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.security.JwtUtils;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.EmailService;
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
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
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
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.otp.expose-in-response:true}")
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

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (!isValidCollegeEmail(email)) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Please enter a valid college email address (e.g. 23eg106c27@anurag.edu.in).");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        // Check if user exists. If not, auto-create a default Student account for
        // college email
        userRepository.findByEmail(email).orElseGet(() -> {
            String defaultName = email.split("@")[0];
            User newUser = User.builder()
                    .name(defaultName.toUpperCase())
                    .email(email)
                    .password(passwordEncoder.encode("college123"))
                    .roles(new HashSet<>(Set.of(Role.STUDENT)))
                    .active(true)
                    .build();
            log.info("Auto-registering new student for college email [{}]", email);
            return userRepository.save(newUser);
        });

        String otp = otpService.generateOtp(email);
        boolean emailSent = emailService.sendOtpEmail(email, otp);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("email", email);

        if (emailSent) {
            response.put("message", "OTP sent successfully to " + email);
        } else if (exposeOtpInResponse || !emailService.isConfigured()) {
            response.put("message", "Email delivery unavailable. Use the OTP code shown below.");
            response.put("otp", otp);
        } else {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Failed to send OTP to college email. Please try again in a moment.");
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
