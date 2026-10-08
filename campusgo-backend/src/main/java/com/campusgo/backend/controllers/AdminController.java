package com.campusgo.backend.controllers;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.OrderRepository;
import com.campusgo.backend.repositories.ProductRepository;
import com.campusgo.backend.repositories.ShopRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.AdminService;
import com.campusgo.backend.services.AuditLogService;
import com.campusgo.backend.services.DeliveryApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;
    private final DeliveryApplicationService deliveryApplicationService;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final AuditLogService auditLogService;

    private boolean isManager(UserDetailsImpl userDetails) {
        return userDetails != null && userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isValidAdminTransition(OrderStatus current, OrderStatus next) {
        if (next == OrderStatus.CANCELLED) {
            return current != OrderStatus.DELIVERED && current != OrderStatus.CANCELLED;
        }
        return switch (current) {
            case PLACED -> next == OrderStatus.ACCEPTED;
            case ACCEPTED -> next == OrderStatus.PREPARING;
            case PREPARING -> next == OrderStatus.READY_FOR_PICKUP;
            case READY_FOR_PICKUP -> next == OrderStatus.ASSIGNED;
            case ASSIGNED -> next == OrderStatus.PICKED_UP;
            case PICKED_UP -> next == OrderStatus.OUT_FOR_DELIVERY || next == OrderStatus.DELIVERED;
            case OUT_FOR_DELIVERY -> next == OrderStatus.DELIVERED;
            default -> false;
        };
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/delivery-partners")
    public ResponseEntity<?> getDeliveryPartners(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getDeliveryPartners());
    }

    @PutMapping("/delivery-partners/{id}/suspend")
    public ResponseEntity<?> suspendDeliveryPartner(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        String status = body.getOrDefault("status", "SUSPENDED");
        String reason = body.getOrDefault("reason", "Suspended by admin");
        return ResponseEntity.ok(adminService.updateDeliveryPartnerStatus(id, status, reason, userDetails.getUsername()));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserActive(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.toggleUserActive(id, userDetails.getUsername()));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getAllOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        List<Order> orders = orderRepository.findAll();
        orders.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateAdminOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        Order order = orderRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        String statusStr = body.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
        }
        try {
            OrderStatus newStatus = OrderStatus.valueOf(statusStr);
            if (!isValidAdminTransition(order.getOrderStatus(), newStatus)) {
                return ResponseEntity.status(409).body(Map.of(
                        "message", "Invalid status transition from " + order.getOrderStatus() + " to " + newStatus
                ));
            }
            order.setOrderStatus(newStatus);
            if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveredAt(java.time.LocalDateTime.now());
                order.setPaymentStatus("PAID");
            }
            Order updated = orderRepository.save(order);
            log.info("Manager {} updated order {} status to {}", userDetails.getUsername(), order.getOrderNumber(), newStatus);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid order status: " + statusStr));
        }
    }

    @GetMapping("/payments")
    public ResponseEntity<?> getPayments(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        List<Order> orders = orderRepository.findAll();
        orders.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        List<Map<String, Object>> payments = orders.stream().map(o -> {
            Map<String, Object> p = new HashMap<>();
            p.put("id", "TXN" + o.getId() + "CG");
            p.put("orderId", o.getId());
            p.put("studentName", o.getUser() != null ? o.getUser().getName() : "Student");
            p.put("studentEmail", o.getUser() != null ? o.getUser().getEmail() : "N/A");
            p.put("amount", o.getTotalAmount());
            p.put("paymentMethod", o.getPaymentMethod() != null ? o.getPaymentMethod() : "UPI");
            p.put("paymentStatus", o.getOrderStatus() == OrderStatus.CANCELLED ? "REFUNDED" : "PAID");
            p.put("createdAt", o.getCreatedAt());
            return p;
        }).toList();

        return ResponseEntity.ok(payments);
    }

    @GetMapping("/complaints")
    public ResponseEntity<?> getComplaints(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getAllComplaints(status));
    }

    @PutMapping("/complaints/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        String notes = body.getOrDefault("notes", "Resolved by admin");
        String status = body.getOrDefault("status", "RESOLVED");
        return ResponseEntity.ok(adminService.resolveComplaint(id, notes, status, userDetails.getUsername()));
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getAllNotifications());
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> broadcastNotification(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        String title = body.get("title");
        String message = body.get("message");
        String audience = body.getOrDefault("audience", "ALL");
        if (title == null || message == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title and message are required"));
        }
        return ResponseEntity.ok(adminService.broadcastNotification(title, message, audience, userDetails.getUsername()));
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(
            @RequestBody Map<String, String> settings,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.updateSettings(settings, userDetails.getUsername()));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }
        return ResponseEntity.ok(adminService.getAuditLogs());
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isManager(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager authority required"));
        }

        List<Order> orders = orderRepository.findAll();
        BigDecimal totalRevenue = orders.stream()
                .filter(o -> o.getOrderStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> statusCounts = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getOrderStatus().name(), Collectors.counting()));

        return ResponseEntity.ok(Map.of(
                "totalOrders", orders.size(),
                "totalRevenue", totalRevenue,
                "statusCounts", statusCounts,
                "activePartners", adminService.getDeliveryPartners().stream().filter(p -> "ACTIVE".equals(p.get("partnerStatus"))).count()
        ));
    }
}
