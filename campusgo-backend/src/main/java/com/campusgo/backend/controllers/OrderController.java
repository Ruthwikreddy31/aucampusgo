package com.campusgo.backend.controllers;

import com.campusgo.backend.models.*;
import com.campusgo.backend.payload.request.CreateOrderRequest;
import com.campusgo.backend.payload.request.OrderItemRequest;
import com.campusgo.backend.repositories.*;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.NotificationService;
import com.campusgo.backend.services.ZestBiddingService;
import com.campusgo.backend.services.ZestEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CampusSettingRepository campusSettingRepository;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final DeliveryBidRepository bidRepository;
    private final ZestBiddingService biddingService;
    private final ZestEventPublisher eventPublisher;
    private final NotificationService notificationService;
    private final ReviewRepository reviewRepository;

    @Value("${app.campus.latitude:17.4018}")
    private double defaultCampusLat;

    @Value("${app.campus.longitude:78.5602}")
    private double defaultCampusLng;

    @Value("${app.campus.radius-meters:15000.0}")
    private double defaultCampusRadiusMeters;

    @Value("${app.campus.name:Anurag University - Uppal Delivery Zone}")
    private String defaultCampusName;

    private double getCampusLat() {
        return campusSettingRepository.findBySettingKey("campus.latitude")
                .map(s -> {
                    try { return Double.parseDouble(s.getSettingValue().trim()); }
                    catch (Exception e) { return defaultCampusLat; }
                }).orElse(defaultCampusLat);
    }

    private double getCampusLng() {
        return campusSettingRepository.findBySettingKey("campus.longitude")
                .map(s -> {
                    try { return Double.parseDouble(s.getSettingValue().trim()); }
                    catch (Exception e) { return defaultCampusLng; }
                }).orElse(defaultCampusLng);
    }

    private double getCampusRadiusMeters() {
        return campusSettingRepository.findBySettingKey("delivery.radius.meters")
                .map(s -> {
                    try { return Double.parseDouble(s.getSettingValue().trim()); }
                    catch (Exception e) { return defaultCampusRadiusMeters; }
                })
                .or(() -> campusSettingRepository.findBySettingKey("geofence_radius")
                        .map(s -> {
                            try { return Double.parseDouble(s.getSettingValue().trim()) * 1000.0; }
                            catch (Exception e) { return defaultCampusRadiusMeters; }
                        }))
                .orElse(defaultCampusRadiusMeters);
    }

    private String getCampusName() {
        return campusSettingRepository.findBySettingKey("campus_name")
                .map(CampusSetting::getSettingValue)
                .filter(val -> val != null && !val.isBlank())
                .orElse(defaultCampusName);
    }

    private boolean hasAuthority(UserDetailsImpl userDetails, Role role) {
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role.name()));
    }

    private boolean isValidCanteenTransition(OrderStatus current, OrderStatus next) {
        if (next == OrderStatus.REJECTED || next == OrderStatus.CANCELLED) {
            return current != OrderStatus.DELIVERED && current != OrderStatus.PICKED_UP;
        }
        if (next == OrderStatus.ACCEPTED || next == OrderStatus.PREPARING) {
            return current == OrderStatus.PLACED || current == OrderStatus.ACCEPTED || current == OrderStatus.DELIVERY_BIDDING || current == OrderStatus.DELIVERY_PARTNER_ASSIGNED || current == OrderStatus.DELIVERY_PARTNER_ACCEPTED;
        }
        if (next == OrderStatus.PACKED || next == OrderStatus.READY_FOR_PICKUP) {
            return current != OrderStatus.PICKED_UP && current != OrderStatus.OUT_FOR_DELIVERY && current != OrderStatus.DELIVERED && current != OrderStatus.CANCELLED;
        }
        return false;
    }

    private double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    @PostMapping("/verify-location")
    public ResponseEntity<?> verifyCampusLocation(@RequestBody Map<String, Double> coords) {
        Double lat = coords.get("latitude");
        Double lng = coords.get("longitude");

        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Latitude and Longitude required"));
        }

        double campusLat = getCampusLat();
        double campusLng = getCampusLng();
        double campusRadius = getCampusRadiusMeters();
        String campusName = getCampusName();

        double distance = calculateDistanceMeters(lat, lng, campusLat, campusLng);
        boolean inside = distance <= campusRadius;

        return ResponseEntity.ok(Map.of(
                "insideCampus", inside,
                "distanceMeters", Math.round(distance),
                "allowedRadiusMeters", campusRadius,
                "campusName", campusName
        ));
    }

    public static boolean isValidPhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) return false;
        String cleaned = phone.replaceAll("[\\s\\-\\(\\)]", "");
        if (cleaned.startsWith("+91")) {
            cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
        }
        return cleaned.matches("^[6-9]\\d{9}$");
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createOrder(
            @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order must contain at least one item"));
        }

        // Validate mandatory delivery details
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Full Name is required for delivery"));
        }

        if (request.getCustomerPhone() == null || !isValidPhoneNumber(request.getCustomerPhone())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please enter a valid phone number (e.g. +91 98491 88776)"));
        }

        if (request.getDeliveryLocation() == null || request.getDeliveryLocation().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Delivery Location is required"));
        }

        if (request.getLatitude() == null || request.getLongitude() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Campus location is required to place an order"));
        }

        double campusLat = getCampusLat();
        double campusLng = getCampusLng();
        double campusRadius = getCampusRadiusMeters();
        String campusName = getCampusName();

        double distance = calculateDistanceMeters(request.getLatitude(), request.getLongitude(), campusLat, campusLng);
        if (distance > campusRadius) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", "You are outside the CampusGo delivery area. Please enter the campus to place an order.",
                    "distanceMeters", Math.round(distance),
                    "allowedRadiusMeters", campusRadius
            ));
        }

        int randomSuffix = ThreadLocalRandom.current().nextInt(100000, 999999);
        String orderNumber = "CG-" + Year.now().getValue() + "-" + randomSuffix;

        int deadlineMinutes = request.getDeadlineMinutes() != null ? request.getDeadlineMinutes() : 5;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadlineAt = now.plusMinutes(deadlineMinutes);

        String deliveryDeadline = request.getDeliveryDeadline() != null && !request.getDeliveryDeadline().trim().isEmpty()
                ? request.getDeliveryDeadline().trim()
                : (deadlineMinutes + " Mins");

        BigDecimal deliveryFee = new BigDecimal("15.00");
        BigDecimal subtotal = BigDecimal.ZERO;
        Shop orderShop = null;

        String deliveryOtp = String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 10000));

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .user(user)
                .customerName(request.getCustomerName().trim())
                .customerPhone(request.getCustomerPhone().trim())
                .deliveryLocation(request.getDeliveryLocation().trim())
                .deliveryInstructions(request.getDeliveryInstructions())
                .deliveryDeadline(deliveryDeadline)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH_ON_DELIVERY")
                .paymentStatus("PENDING")
                .orderStatus(OrderStatus.PLACED)
                .managerStatus("PENDING")
                .preparationStatus("NOT_STARTED")
                .biddingStatus("OPEN")
                .biddingDeadline(deadlineAt)
                .deliveryStatus("WAITING_FOR_BIDDING")
                .deliveryFee(deliveryFee)
                .platformFee(new BigDecimal("5.00"))
                .deadlineMinutes(deadlineMinutes)
                .deadlineAt(deadlineAt)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .deliveryLatitude(request.getLatitude())
                .deliveryLongitude(request.getLongitude())
                .deliveryOtp(deliveryOtp)
                .deliveryOtpVerified(false)
                .build();

        for (OrderItemRequest itemReq : request.getItems()) {
            Product p = productRepository.findById(itemReq.getProductId())
                    .filter(product -> product.isActive() && product.isAvailable())
                    .orElseThrow(() -> new IllegalArgumentException("Product unavailable with id: " + itemReq.getProductId()));

            int qty = Math.max(1, itemReq.getQuantity());
            if (p.getStock() != null && p.getStock() > 0) {
                p.setStock(Math.max(0, p.getStock() - qty));
                productRepository.save(p);
            }

            if (orderShop == null && p.getShop() != null) {
                orderShop = p.getShop();
            }

            BigDecimal linePrice = p.getPrice();

            OrderItem item = OrderItem.builder()
                    .product(p)
                    .quantity(qty)
                    .price(linePrice)
                    .productName(p.getName())
                    .build();
            order.addItem(item);
            subtotal = subtotal.add(linePrice.multiply(BigDecimal.valueOf(qty)));
        }

        order.setShop(orderShop);
        order.setSubtotal(subtotal);
        order.setTotalAmount(subtotal.add(deliveryFee).add(new BigDecimal("5.00")));

        Order saved = orderRepository.save(order);
        biddingService.recordStatusHistory(saved.getId(), null, OrderStatus.PLACED.name(), user.getName(), "Order placed");

        // PROCESS 2: Immediately open delivery request for bidding by verified delivery partners in parallel
        try {
            biddingService.createDeliveryRequest(saved, deadlineMinutes);
        } catch (Exception e) {
            log.error("Failed to create parallel delivery request for order {}: {}", saved.getOrderNumber(), e.getMessage());
        }

        // PROCESS 1: Immediately notify manager / canteen
        notificationService.notifyUser(user.getId(), saved.getId(), "Order placed",
                "Your order " + saved.getOrderNumber() + " was placed successfully. Delivery bidding is now open.", "ORDER_PLACED");
        notificationService.notifyRole(Role.MANAGER, saved.getId(), "New order received",
                "Order " + saved.getOrderNumber() + " is waiting for acceptance.", "NEW_ORDER");
        notificationService.notifyRole(Role.CANTEEN_MEMBER, saved.getId(), "New order received",
                "Order " + saved.getOrderNumber() + " is waiting for acceptance.", "NEW_ORDER");
        eventPublisher.publishOrderStatusChanged(saved.getId(), OrderStatus.PLACED.name(), saved);

        log.info("Created new campus order: {} for user: {} with delivery OTP: {}. Parallel bidding started.", saved.getOrderNumber(), user.getEmail(), deliveryOtp);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Order>> getMyOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(orderRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        return orderRepository.findById(id)
                .map(o -> {
                    boolean isOwner = o.getUser().getId().equals(userDetails.getId());
                    boolean isManager = userDetails.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                    || a.getAuthority().equals("ROLE_MANAGER")
                                    || a.getAuthority().equals("ROLE_STORE_STAFF")
                                    || a.getAuthority().equals("ROLE_CANTEEN_MEMBER"));
                    boolean isAssignedAgent = o.getDeliveryAgent() != null && o.getDeliveryAgent().getUser().getId().equals(userDetails.getId());
                    boolean isAgent = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DELIVERY_PARTNER"));

                    if (isOwner || isManager || isAssignedAgent || isAgent) {
                        return ResponseEntity.ok(o);
                    }
                    return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping({"/{id}/tracking", "/{id}/status"})
    public ResponseEntity<?> getOrderTracking(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Order order = orderOpt.get();
        boolean isOwner = order.getUser().getId().equals(userDetails.getId());
        boolean isManager = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_MANAGER")
                        || a.getAuthority().equals("ROLE_STORE_STAFF")
                        || a.getAuthority().equals("ROLE_CANTEEN_MEMBER"));
        boolean isAssignedAgent = order.getDeliveryAgent() != null
                && order.getDeliveryAgent().getUser() != null
                && order.getDeliveryAgent().getUser().getId().equals(userDetails.getId());
        if (!isOwner && !isManager && !isAssignedAgent) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        LocalDateTime now = LocalDateTime.now();
        
        long remainingSeconds = 0;
        String deadlineStatus = "On Time";
        if (order.getDeadlineAt() != null) {
            if (now.isBefore(order.getDeadlineAt())) {
                remainingSeconds = Duration.between(now, order.getDeadlineAt()).getSeconds();
                if (remainingSeconds <= 120) {
                    deadlineStatus = "Deadline Approaching";
                }
            } else {
                deadlineStatus = "Deadline Exceeded";
                remainingSeconds = 0;
            }
        }

        if (order.getOrderStatus() == OrderStatus.DELIVERED) {
            deadlineStatus = "Delivered";
        }

        List<OrderStatusHistory> history = statusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(id);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getId());
        response.put("orderNumber", order.getOrderNumber());
        response.put("orderStatus", order.getOrderStatus());
        response.put("managerStatus", order.getManagerStatus() != null ? order.getManagerStatus() : "PENDING");
        response.put("preparationStatus", order.getPreparationStatus() != null ? order.getPreparationStatus() : "NOT_STARTED");
        response.put("biddingStatus", order.getBiddingStatus() != null ? order.getBiddingStatus() : "OPEN");
        response.put("biddingDeadline", order.getBiddingDeadline() != null ? order.getBiddingDeadline() : order.getDeadlineAt());
        response.put("deliveryStatus", order.getDeliveryStatus());
        response.put("deadlineMinutes", order.getDeadlineMinutes());
        response.put("deadlineAt", order.getDeadlineAt());
        response.put("remainingSeconds", remainingSeconds);
        response.put("deadlineStatus", deadlineStatus);
        response.put("deliveryLocation", order.getDeliveryLocation());
        response.put("totalAmount", order.getTotalAmount());
        response.put("subtotal", order.getSubtotal());
        response.put("deliveryFee", order.getDeliveryFee());
        response.put("platformFee", order.getPlatformFee());
        response.put("deliveryOtp", (isOwner || isManager) ? order.getDeliveryOtp() : null);
        response.put("deliveryOtpVerified", order.getDeliveryOtpVerified());
        response.put("pickupVerificationCode", order.getPickupVerificationCode());
        response.put("selectedBidId", order.getSelectedBidId());
        response.put("selectedDeliveryPartnerId", order.getSelectedDeliveryPartnerId());
        response.put("statusHistory", history);
        response.put("items", order.getItems());
        response.put("review", reviewRepository.findByOrderId(order.getId()).orElse(null));

        if (order.getDeliveryAgent() != null) {
            User partnerUser = order.getDeliveryAgent().getUser();
            Optional<DeliveryBid> bidOpt = order.getSelectedBidId() != null ? bidRepository.findById(order.getSelectedBidId()) : Optional.empty();
            
            Map<String, Object> partnerMap = new HashMap<>();
            partnerMap.put("name", partnerUser.getName());
            partnerMap.put("rating", bidOpt.map(DeliveryBid::getRating).orElse(4.9));
            partnerMap.put("completedDeliveries", bidOpt.map(DeliveryBid::getCompletedDeliveries).orElse(120));
            partnerMap.put("estimatedDeliveryTimeMinutes", bidOpt.map(DeliveryBid::getEstimatedDeliveryTimeMinutes).orElse(5));
            partnerMap.put("bidAmount", order.getDeliveryFee());
            
            response.put("deliveryPartner", partnerMap);
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/canteen-status")
    public ResponseEntity<?> updateCanteenOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        Order order = orderRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!hasAuthority(userDetails, Role.MANAGER) && !hasAuthority(userDetails, Role.CANTEEN_MEMBER) && !hasAuthority(userDetails, Role.STORE_STAFF) && !hasAuthority(userDetails, Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("message", "Canteen or admin access required"));
        }
        String statusStr = body.get("status");

        if (statusStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
        }

        try {
            OrderStatus newStatus = OrderStatus.valueOf(statusStr);
            if (!isValidCanteenTransition(order.getOrderStatus(), newStatus)) {
                return ResponseEntity.status(409).body(Map.of(
                        "message", "Invalid status transition from " + order.getOrderStatus() + " to " + newStatus
                ));
            }

            if (newStatus == OrderStatus.REJECTED) {
                String reason = body.get("reason");
                order.setRejectionReason(reason != null ? reason : "Store declined order");
                order.setManagerStatus("REJECTED");
                order.setBiddingStatus("CLOSED");
            }

            if (newStatus == OrderStatus.ACCEPTED) {
                order.setManagerStatus("ACCEPTED");
                order.setPreparationStatus("PREPARING");
            }
            if (newStatus == OrderStatus.PREPARING) {
                order.setManagerStatus("ACCEPTED");
                order.setPreparationStatus("PREPARING");
            }
            if (newStatus == OrderStatus.READY_FOR_PICKUP) {
                order.setManagerStatus("ACCEPTED");
                order.setPreparationStatus("READY_FOR_PICKUP");
                if (order.getPickupVerificationCode() == null) {
                    String pickupCode = String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 10000));
                    order.setPickupVerificationCode(pickupCode);
                }
                if (order.getDeliveryAgent() != null || order.getSelectedBidId() != null) {
                    order.setDeliveryStatus("READY_FOR_PICKUP");
                    if (order.getDeliveryAgent() != null && order.getDeliveryAgent().getUser() != null) {
                        notificationService.notifyUser(order.getDeliveryAgent().getUser().getId(), order.getId(),
                                "Order ready for pickup", "Order " + order.getOrderNumber() + " is ready for pickup at the canteen.", "ORDER_READY");
                    }
                } else {
                    order.setDeliveryStatus("WAITING_FOR_DELIVERY_PARTNER");
                }
            }

            String oldStatus = order.getOrderStatus().name();
            order.setOrderStatus(newStatus);
            Order updated = orderRepository.save(order);

            biddingService.recordStatusHistory(id, oldStatus, newStatus.name(), userDetails.getUsername(), "Updated by store staff");
            eventPublisher.publishOrderStatusChanged(id, newStatus.name(), updated);
            if (newStatus == OrderStatus.READY_FOR_PICKUP) {
                notificationService.notifyUser(updated.getUser().getId(), updated.getId(),
                        "Order ready", "Order " + updated.getOrderNumber() + " has been prepared by the kitchen and is ready for pickup.", "ORDER_READY");
            } else if (newStatus == OrderStatus.ACCEPTED) {
                notificationService.notifyUser(updated.getUser().getId(), updated.getId(),
                        "Manager accepted order", "The store accepted order " + updated.getOrderNumber() + " and started preparation.", "ORDER_ACCEPTED");
            }

            log.info("Canteen updated order {} status to {} (managerStatus={}, prepStatus={}, deliveryStatus={})",
                    order.getOrderNumber(), newStatus, order.getManagerStatus(), order.getPreparationStatus(), order.getDeliveryStatus());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid order status: " + statusStr));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return updateCanteenOrderStatus(id, body, userDetails);
    }

    @PostMapping("/{id}/verify-pickup")
    public ResponseEntity<?> verifyPickupCode(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        Order order = orderRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!hasAuthority(userDetails, Role.CANTEEN_MEMBER) && !hasAuthority(userDetails, Role.STORE_STAFF) && !hasAuthority(userDetails, Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("message", "Canteen access required"));
        }

        // Validate BOTH conditions: 1. Ready for pickup, 2. Delivery partner assigned
        boolean isReady = "READY_FOR_PICKUP".equalsIgnoreCase(order.getPreparationStatus()) || order.getOrderStatus() == OrderStatus.READY_FOR_PICKUP;
        boolean hasPartner = order.getDeliveryAgent() != null || order.getSelectedBidId() != null;
        if (!isReady) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order preparation is not completed yet"));
        }
        if (!hasPartner) {
            return ResponseEntity.badRequest().body(Map.of("message", "A delivery partner must be selected and assigned before pickup"));
        }

        String code = body.get("code");
        if (code == null || order.getPickupVerificationCode() == null || !code.trim().equals(order.getPickupVerificationCode().trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid pickup verification code"));
        }

        String oldStatus = order.getOrderStatus().name();
        order.setPickupVerifiedAt(LocalDateTime.now());
        order.setOrderStatus(OrderStatus.PICKED_UP);
        order.setDeliveryStatus("PICKED_UP");
        Order updated = orderRepository.save(order);

        biddingService.recordStatusHistory(id, oldStatus, OrderStatus.PICKED_UP.name(), userDetails.getUsername(), "Canteen verified pickup code");
        eventPublisher.publishOrderStatusChanged(id, OrderStatus.PICKED_UP.name(), updated);

        log.info("Pickup verified for order {}", order.getOrderNumber());
        return ResponseEntity.ok(updated);
    }
}
