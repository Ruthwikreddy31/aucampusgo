package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Order;
import com.campusgo.backend.models.OrderStatus;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.Shop;
import com.campusgo.backend.repositories.OrderRepository;
import com.campusgo.backend.repositories.ShopRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.NotificationService;
import com.campusgo.backend.services.ZestBiddingService;
import com.campusgo.backend.services.ZestEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final ZestBiddingService biddingService;
    private final ZestEventPublisher eventPublisher;
    private final NotificationService notificationService;

    private boolean hasAuthority(UserDetailsImpl userDetails, Role role) {
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role.name()));
    }

    private boolean canManageOrders(UserDetailsImpl userDetails) {
        return hasAuthority(userDetails, Role.MANAGER)
                || hasAuthority(userDetails, Role.STORE_STAFF)
                || hasAuthority(userDetails, Role.CANTEEN_MEMBER)
                || hasAuthority(userDetails, Role.ADMIN);
    }

    private boolean isStoreManagerOnly(UserDetailsImpl userDetails) {
        return hasAuthority(userDetails, Role.MANAGER)
                && !hasAuthority(userDetails, Role.ADMIN);
    }

    private List<Long> managedShopIds(UserDetailsImpl userDetails) {
        return shopRepository.findByManagerUserId(userDetails.getId()).stream()
                .map(Shop::getId)
                .collect(Collectors.toList());
    }

    private boolean canAccessOrder(UserDetailsImpl userDetails, Order order) {
        if (hasAuthority(userDetails, Role.ADMIN)) {
            return true;
        }
        List<Long> shopIds = managedShopIds(userDetails);
        if (shopIds.isEmpty()) {
            return true;
        }
        return order.getShop() != null && shopIds.contains(order.getShop().getId());
    }

    private boolean isValidManagerTransition(OrderStatus current, OrderStatus next) {
        return switch (current) {
            case PLACED -> next == OrderStatus.ACCEPTED || next == OrderStatus.REJECTED || next == OrderStatus.CANCELLED;
            case ACCEPTED -> next == OrderStatus.PREPARING || next == OrderStatus.READY_FOR_PICKUP || next == OrderStatus.CANCELLED;
            case PREPARING -> next == OrderStatus.PACKED || next == OrderStatus.READY_FOR_PICKUP || next == OrderStatus.CANCELLED;
            case PACKED -> next == OrderStatus.READY_FOR_PICKUP || next == OrderStatus.CANCELLED;
            default -> false;
        };
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getManagerOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        if (!canManageOrders(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager access required"));
        }

        List<Order> orders = orderRepository.findAll();
        if (isStoreManagerOnly(userDetails)) {
            List<Long> shopIds = managedShopIds(userDetails);
            if (!shopIds.isEmpty()) {
                orders = orders.stream()
                        .filter(o -> o.getShop() != null && shopIds.contains(o.getShop().getId()))
                        .collect(Collectors.toList());
            }
        }
        orders.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        if (!canManageOrders(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager access required"));
        }
        List<Order> orders = (List<Order>) getManagerOrders(userDetails).getBody();
        if (orders == null) {
            orders = List.of();
        }
        long today = orders.stream().filter(o -> o.getCreatedAt() != null && o.getCreatedAt().toLocalDate().equals(java.time.LocalDate.now())).count();
        return ResponseEntity.ok(Map.of(
                "todayOrders", today,
                "pendingAcceptance", orders.stream().filter(o -> o.getOrderStatus() == OrderStatus.PLACED).count(),
                "preparing", orders.stream().filter(o -> o.getOrderStatus() == OrderStatus.ACCEPTED || o.getOrderStatus() == OrderStatus.PREPARING).count(),
                "ready", orders.stream().filter(o -> o.getOrderStatus() == OrderStatus.READY_FOR_PICKUP || o.getOrderStatus() == OrderStatus.DELIVERY_BIDDING).count()
        ));
    }

    @PostMapping("/orders/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateManagerStatus(orderId, OrderStatus.ACCEPTED, null, userDetails);
    }

    @PostMapping("/orders/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(
            @PathVariable Long orderId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateManagerStatus(orderId, OrderStatus.REJECTED, body, userDetails);
    }

    @PostMapping({"/orders/{orderId}/prepare", "/orders/{orderId}/preparing"})
    public ResponseEntity<?> markPreparing(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateManagerStatus(orderId, OrderStatus.PREPARING, null, userDetails);
    }

    @PostMapping("/orders/{orderId}/packed")
    public ResponseEntity<?> markPacked(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateManagerStatus(orderId, OrderStatus.PACKED, null, userDetails);
    }

    @PostMapping("/orders/{orderId}/ready")
    public ResponseEntity<?> markReady(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateManagerStatus(orderId, OrderStatus.READY_FOR_PICKUP, null, userDetails);
    }

    @PostMapping("/orders/{orderId}/confirm-pickup")
    public ResponseEntity<?> confirmPickup(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        if (!canManageOrders(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager access required"));
        }
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!canAccessOrder(userDetails, order)) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only manage orders for your store"));
        }
        if (order.getOrderStatus() != OrderStatus.DELIVERY_PARTNER_ACCEPTED
                && order.getOrderStatus() != OrderStatus.PICKUP_STARTED
                && order.getOrderStatus() != OrderStatus.DELIVERY_PARTNER_ASSIGNED
                && order.getOrderStatus() != OrderStatus.ASSIGNED
                && order.getOrderStatus() != OrderStatus.DELIVERY_ASSIGNED) {
            return ResponseEntity.status(409).body(Map.of("message", "Order is not ready for pickup confirmation"));
        }
        String oldStatus = order.getOrderStatus().name();
        order.setPickupVerifiedAt(LocalDateTime.now());
        order.setOrderStatus(OrderStatus.PICKED_UP);
        order.setDeliveryStatus("PICKED_UP");
        Order updated = orderRepository.save(order);
        biddingService.recordStatusHistory(orderId, oldStatus, OrderStatus.PICKED_UP.name(), userDetails.getUsername(), "Manager confirmed pickup");
        eventPublisher.publishOrderStatusChanged(orderId, OrderStatus.PICKED_UP.name(), updated);
        notificationService.notifyUser(updated.getUser().getId(), updated.getId(),
                "Order picked up", "Your order " + updated.getOrderNumber() + " has been picked up.", "PICKED_UP");
        return ResponseEntity.ok(updated);
    }

    private ResponseEntity<?> updateManagerStatus(
            Long orderId,
            OrderStatus newStatus,
            Map<String, String> body,
            UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        if (!canManageOrders(userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Manager access required"));
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!canAccessOrder(userDetails, order)) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only manage orders for your store"));
        }
        if (!isValidManagerTransition(order.getOrderStatus(), newStatus)) {
            return ResponseEntity.status(409).body(Map.of(
                    "message", "Invalid status transition from " + order.getOrderStatus() + " to " + newStatus
            ));
        }

        if (newStatus == OrderStatus.REJECTED) {
            String reason = body != null ? body.get("reason") : null;
            order.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Store declined order");
        }

        if (newStatus == OrderStatus.READY_FOR_PICKUP && order.getPickupVerificationCode() == null) {
            order.setPickupVerificationCode(String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 10000)));
        }

        if (newStatus == OrderStatus.ACCEPTED) {
            order.setPreparationStatus("PREPARING");
        }
        if (newStatus == OrderStatus.PREPARING) {
            order.setPreparationStatus("PREPARING");
        }
        if (newStatus == OrderStatus.READY_FOR_PICKUP) {
            order.setPreparationStatus("READY_FOR_PICKUP");
        }

        String oldStatus = order.getOrderStatus().name();
        order.setOrderStatus(newStatus);
        Order updated = orderRepository.save(order);

        biddingService.recordStatusHistory(orderId, oldStatus, newStatus.name(), userDetails.getUsername(), "Updated by manager");
        eventPublisher.publishOrderStatusChanged(orderId, newStatus.name(), updated);

        if (newStatus == OrderStatus.ACCEPTED) {
            notificationService.notifyUser(updated.getUser().getId(), updated.getId(),
                    "Manager accepted order", "The store accepted order " + updated.getOrderNumber() + " and is preparing it.", "ORDER_ACCEPTED");
        }

        if (newStatus == OrderStatus.READY_FOR_PICKUP) {
            biddingService.createDeliveryRequest(updated, updated.getDeadlineMinutes());
            notificationService.notifyUser(updated.getUser().getId(), updated.getId(),
                    "Order ready", "Order " + updated.getOrderNumber() + " is ready. Delivery bidding is now open.", "ORDER_READY");
        }

        return ResponseEntity.ok(updated);
    }
}
