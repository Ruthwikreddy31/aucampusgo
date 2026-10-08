package com.campusgo.backend.services;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {

    private static final int OTP_EXPIRE_MINUTES = 5;
    private final Map<String, OtpData> otpMap = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Getter
    @AllArgsConstructor
    public static class OtpData {
        private String code;
        private LocalDateTime expiryTime;
    }

    /**
     * Generate a 6-digit OTP for the given email
     */
    public String generateOtp(String email) {
        String cleanEmail = email.trim().toLowerCase();
        // Generate a 6-digit numeric OTP
        int number = 100000 + random.nextInt(900000);
        String otp = String.valueOf(number);

        LocalDateTime expiry = LocalDateTime.now().plusMinutes(OTP_EXPIRE_MINUTES);
        otpMap.put(cleanEmail, new OtpData(otp, expiry));

        log.info("Generated OTP [{}] for email [{}] expiring at [{}]", otp, cleanEmail, expiry);
        return otp;
    }

    /**
     * Verify the OTP for a given email
     */
    public boolean verifyOtp(String email, String inputOtp) {
        if (email == null || inputOtp == null) {
            return false;
        }

        String cleanEmail = email.trim().toLowerCase();
        OtpData otpData = otpMap.get(cleanEmail);

        if (otpData == null) {
            log.warn("No OTP found for email [{}]", cleanEmail);
            return false;
        }

        if (LocalDateTime.now().isAfter(otpData.getExpiryTime())) {
            log.warn("OTP for email [{}] has expired", cleanEmail);
            otpMap.remove(cleanEmail);
            return false;
        }

        boolean matches = otpData.getCode().equals(inputOtp.trim());
        if (matches) {
            otpMap.remove(cleanEmail); // Single use
            log.info("OTP verified successfully for email [{}]", cleanEmail);
            return true;
        }

        log.warn("Invalid OTP input [{}] for email [{}]", inputOtp, cleanEmail);
        return false;
    }
}
