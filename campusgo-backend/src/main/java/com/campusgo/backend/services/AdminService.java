package com.campusgo.backend.services;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DeliveryApplicationRepository applicationRepository;
    private final ComplaintRepository complaintRepository;
    private final CampusSettingRepository campusSettingRepository;
    private final NotificationMessageRepository notificationMessageRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;

    @Value("${app.delivery.earning-per-delivery:15.00}")
    private BigDecimal earningPerDelivery;

    public Map<String, Object> getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalStudents = userRepository.countByRolesContaining(Role.STUDENT);
        long totalWorkers = userRepository.countByRolesContaining(Role.CANTEEN_MEMBER);
        long deliveryAgents = deliveryAgentRepository.count();
        long pendingApplications = applicationRepository.countByStatus(ApplicationStatus.PENDING)
                + applicationRepository.countByStatus(ApplicationStatus.UNDER_REVIEW);
        long approvedApplications = applicationRepository.countByStatus(ApplicationStatus.APPROVED);
        long rejectedApplications = applicationRepository.countByStatus(ApplicationStatus.REJECTED);

        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        List<Order> allOrders = orderRepository.findAll();
        List<Order> todayOrders = orderRepository.findByCreatedAtAfter(startOfDay);

        BigDecimal todayRevenue = todayOrders.stream()
                .filter(o -> o.getOrderStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthlyRevenue = allOrders.stream()
                .filter(o -> o.getOrderStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeOrders = allOrders.stream()
                .filter(o -> o.getOrderStatus() != OrderStatus.DELIVERED && o.getOrderStatus() != OrderStatus.CANCELLED)
                .count();

        long completedOrders = allOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .count();

        long cancelledOrders = allOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED)
                .count();

        long activeShops = shopRepository.countByActiveTrue();
        long totalProducts = productRepository.count();
        long openComplaints = complaintRepository.countByStatus("OPEN");

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalStudents", totalStudents);
        stats.put("totalWorkers", totalWorkers);
        stats.put("deliveryPartners", deliveryAgents);
        stats.put("pendingRequests", pendingApplications);
        stats.put("approvedApplications", approvedApplications);
        stats.put("rejectedApplications", rejectedApplications);
        stats.put("todayOrders", todayOrders.size());
        stats.put("totalOrders", allOrders.size());
        stats.put("activeOrders", activeOrders);
        stats.put("completedOrders", completedOrders);
        stats.put("cancelledOrders", cancelledOrders);
        stats.put("todayRevenue", todayRevenue);
        stats.put("monthlyRevenue", monthlyRevenue);
        stats.put("activeShops", activeShops);
        stats.put("totalProducts", totalProducts);
        stats.put("openComplaints", openComplaints);

        return stats;
    }

    public List<Map<String, Object>> getDeliveryPartners() {
        List<DeliveryAgent> agents = deliveryAgentRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (DeliveryAgent agent : agents) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", agent.getId());
            map.put("userId", agent.getUser().getId());
            map.put("name", agent.getUser().getName());
            map.put("email", agent.getUser().getEmail());
            map.put("phone", agent.getUser().getPhone());
            map.put("availabilityStatus", agent.getAvailabilityStatus());
            map.put("partnerStatus", agent.getPartnerStatus());
            map.put("suspensionReason", agent.getSuspensionReason());
            map.put("joinedAt", agent.getCreatedAt());

            List<Order> agentOrders = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(agent.getUser().getId());
            long completed = agentOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED).count();
            long cancelled = agentOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED).count();
            BigDecimal earnings = earningPerDelivery.multiply(BigDecimal.valueOf(completed));

            map.put("completedOrders", completed);
            map.put("cancelledOrders", cancelled);
            map.put("totalEarnings", earnings);

            Optional<DeliveryPartnerApplication> appOpt = applicationRepository.findTopByUserIdOrderByCreatedAtDesc(agent.getUser().getId());
            if (appOpt.isPresent()) {
                DeliveryPartnerApplication app = appOpt.get();
                map.put("applicantType", app.getApplicantType());
                map.put("studentAvailability", app.getStudentAvailability());
                map.put("profilePhotoPath", app.getProfilePhotoPath());
                map.put("studentIdCardPath", app.getStudentIdCardPath());
                map.put("timetablePath", app.getTimetablePath());
                map.put("identityDocumentPath", app.getIdentityDocumentPath());
            } else {
                map.put("applicantType", "STUDENT");
            }

            result.add(map);
        }
        return result;
    }

    @Transactional
    public DeliveryAgent updateDeliveryPartnerStatus(Long agentId, String status, String reason, String adminEmail) {
        DeliveryAgent agent = deliveryAgentRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Delivery agent not found"));
        agent.setPartnerStatus(status);
        agent.setSuspensionReason(reason);
        if ("SUSPENDED".equalsIgnoreCase(status)) {
            agent.setAvailabilityStatus("OFFLINE");
        }
        DeliveryAgent saved = deliveryAgentRepository.save(agent);
        auditLogService.log(adminEmail, "UPDATED_PARTNER_STATUS", "DeliveryAgent", String.valueOf(agentId),
                "Status set to " + status + ". Reason: " + (reason != null ? reason : "None"));
        return saved;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User toggleUserActive(Long userId, String adminEmail) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        auditLogService.log(adminEmail, user.isActive() ? "ENABLE_USER" : "DISABLE_USER", "User",
                String.valueOf(userId), "User: " + user.getEmail() + " active status: " + user.isActive());
        return saved;
    }

    public List<Complaint> getAllComplaints(String status) {
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            return complaintRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        }
        return complaintRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Complaint resolveComplaint(Long complaintId, String notes, String status, String adminEmail) {
        Complaint complaint = complaintRepository.findById(complaintId).orElseThrow();
        complaint.setStatus(status != null ? status : "RESOLVED");
        complaint.setResolutionNotes(notes);
        complaint.setResolvedBy(adminEmail);
        complaint.setResolvedAt(LocalDateTime.now());
        Complaint saved = complaintRepository.save(complaint);
        auditLogService.log(adminEmail, "RESOLVE_COMPLAINT", "Complaint", String.valueOf(complaintId),
                "Status: " + complaint.getStatus() + " | Notes: " + notes);
        return saved;
    }

    public List<NotificationMessage> getAllNotifications() {
        return notificationMessageRepository.findAllByOrderBySentAtDesc();
    }

    @Transactional
    public NotificationMessage broadcastNotification(String title, String message, String audience, String adminEmail) {
        NotificationMessage notif = NotificationMessage.builder()
                .title(title)
                .message(message)
                .targetAudience(audience != null ? audience : "ALL")
                .sentBy(adminEmail)
                .sentAt(LocalDateTime.now())
                .build();
        NotificationMessage saved = notificationMessageRepository.save(notif);
        auditLogService.log(adminEmail, "BROADCAST_NOTIFICATION", "Notification", String.valueOf(saved.getId()),
                "Title: " + title + " | Audience: " + notif.getTargetAudience());
        return saved;
    }

    public Map<String, String> getSettings() {
        List<CampusSetting> list = campusSettingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (CampusSetting s : list) {
            map.put(s.getSettingKey(), s.getSettingValue());
        }
        return map;
    }

    @Transactional
    public Map<String, String> updateSettings(Map<String, String> newSettings, String adminEmail) {
        for (Map.Entry<String, String> e : newSettings.entrySet()) {
            CampusSetting s = campusSettingRepository.findBySettingKey(e.getKey())
                    .orElseGet(() -> CampusSetting.builder().settingKey(e.getKey()).build());
            s.setSettingValue(e.getValue());
            campusSettingRepository.save(s);
        }
        auditLogService.log(adminEmail, "UPDATE_CAMPUS_SETTINGS", "CampusSetting", "GLOBAL",
                "Updated keys: " + newSettings.keySet());
        return getSettings();
    }

    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }
}
