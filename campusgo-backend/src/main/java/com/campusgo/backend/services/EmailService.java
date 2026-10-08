package com.campusgo.backend.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public boolean isConfigured() {
        return mailEnabled
                && mailSenderProvider.getIfAvailable() != null
                && fromAddress != null
                && !fromAddress.isBlank();
    }

    public boolean sendOtpEmail(String toEmail, String otp) {
        if (!isConfigured()) {
            log.warn("Mail not configured. OTP for [{}] was generated but not emailed.", toEmail);
            return false;
        }

        try {
            JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
            if (mailSender == null) {
                return false;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("Your CampusGo login code");
            message.setText(
                    "Your CampusGo verification code is: " + otp + "\n\n"
                            + "This code expires in 5 minutes.\n"
                            + "If you did not request this, you can ignore this email.");
            mailSender.send(message);
            log.info("OTP email sent to [{}]", toEmail);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send OTP email to [{}]: {}", toEmail, ex.getMessage(), ex);
            return false;
        }
    }
}
