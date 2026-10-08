package com.campusgo.backend.services;

import com.campusgo.backend.models.AuditLog;
import com.campusgo.backend.repositories.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(String adminEmail, String action, String targetType, String targetId, String details) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .adminEmail(adminEmail != null ? adminEmail : "system")
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .details(details)
                    .timestamp(LocalDateTime.now())
                    .build();
            auditLogRepository.save(auditLog);
            log.info("[AUDIT] Admin: {} | Action: {} | Target: {} #{} | Details: {}",
                    adminEmail, action, targetType, targetId, details);
        } catch (Exception e) {
            log.error("Failed to write audit log", e);
        }
    }
}
