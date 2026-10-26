package com.campusgo.backend.controllers;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.*;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.DocumentStorageService;
import com.campusgo.backend.services.ZestBiddingService;
import com.campusgo.backend.services.ZestEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
@Slf4j
public class DeliveryController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DeliveryApplicationRepository applicationRepository;
    private final DeliveryAssignmentRepository assignmentRepository;
    private final DocumentStorageService storageService;
    private final WalletTransactionRepository walletTransactionRepository;
    private final ZestBiddingService biddingService;
    private final ZestEventPublisher eventPublisher;
    private final ReviewRepository reviewRepository;

    @Value("${app.delivery.earning-per-delivery:15.00}")
    private BigDecimal earningPerDelivery;

    private boolean isApprovedDeliveryPartner(User user) {
        if (!user.hasRole(Role.DELIVERY_PARTNER)) {
            return false;
        }
        Optional<DeliveryPartnerApplication> app = applicationRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (app.isPresent()) {
            return app.get().getStatus() == ApplicationStatus.APPROVED;
        }
        // If the user already has the DELIVERY_PARTNER role and no non-approved application, treat them as approved
        return true;
    }

    private boolean isEligibleDeliveryPartner(User user) {
        return biddingService.isEligiblePartner(user);
    }

    private boolean isAssignedTo(Order order, User user) {
        return order.getDeliveryAgent() != null
                && order.getDeliveryAgent().getUser() != null
                && order.getDeliveryAgent().getUser().getId().equals(user.getId());
    }

    private DeliveryAgent getOrCreateAgent(User user) {
        return deliveryAgentRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    DeliveryAgent newAgent = DeliveryAgent.builder()
                            .user(user)
                            .availabilityStatus("AVAILABLE")
                            .partnerStatus("INACTIVE")
                            .build();
                    return deliveryAgentRepository.save(newAgent);
                });
    }

    @PostMapping("/location")
    public ResponseEntity<?> updatePartnerLocation(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        Double lat = Double.valueOf(body.get("latitude").toString());
        Double lng = Double.valueOf(body.get("longitude").toString());
        Long orderId = body.containsKey("orderId") ? Long.valueOf(body.get("orderId").toString()) : null;

        if (orderId != null) {
            Order order = orderRepository.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found"));
            if (!isAssignedTo(order, user) || (order.getOrderStatus() != OrderStatus.PICKED_UP && order.getOrderStatus() != OrderStatus.OUT_FOR_DELIVERY)) {
                return ResponseEntity.status(403).body(Map.of("message", "Location can be shared only for your active assigned delivery"));
            }
            eventPublisher.publishDeliveryLocationUpdated(orderId, lat, lng);
        }

        return ResponseEntity.ok(Map.of("success", true, "latitude", lat, "longitude", lng));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getAssignedAndAvailableOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied. Delivery partner approval required."));
        }

        List<Order> myOrders = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> availableOrders = isEligibleDeliveryPartner(user)
                ? orderRepository.findByOrderStatusInOrderByCreatedAtDesc(List.of(
                        OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP))
                        .stream().filter(o -> o.getDeliveryAgent() == null).collect(Collectors.toList())
                : List.of();

        for (Order o : availableOrders) {
            if (myOrders.stream().noneMatch(m -> m.getId().equals(o.getId()))) {
                myOrders.add(o);
            }
        }

        return ResponseEntity.ok(myOrders);
    }

    @GetMapping("/available-orders")
    public ResponseEntity<?> getAvailableOrdersForBidding(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        // Only ACTIVE + AVAILABLE (eligible) partners can see open bidding orders
        if (!isEligibleDeliveryPartner(user)) {
            log.info("Delivery partner {} is approved but not eligible (ACTIVE+AVAILABLE) to view open orders", user.getName());
            return ResponseEntity.ok(List.of());
        }

        // Return all orders whose biddingStatus is OPEN so delivery partners can bid
        List<Order> openBiddingOrders = orderRepository.findAllOpenBiddingOrders();
        return ResponseEntity.ok(openBiddingOrders);
    }

    @GetMapping("/active-orders")
    public ResponseEntity<?> getActiveOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        // Orders assigned to this partner via deliveryAgent
        List<Order> agentOrders = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.ASSIGNED
                        || o.getOrderStatus() == OrderStatus.DELIVERY_ASSIGNED
                        || o.getOrderStatus() == OrderStatus.PICKED_UP
                        || o.getOrderStatus() == OrderStatus.READY_FOR_PICKUP
                        || o.getOrderStatus() == OrderStatus.OUT_FOR_DELIVERY)
                .collect(Collectors.toList());

        // Also include orders where this partner was selected (bid confirmed or pending confirmation)
        List<Order> selectedOrders = orderRepository.findBySelectedDeliveryPartnerIdAndActiveStatus(user.getId());
        for (Order o : selectedOrders) {
            if (agentOrders.stream().noneMatch(a -> a.getId().equals(o.getId()))) {
                agentOrders.add(o);
            }
        }

        return ResponseEntity.ok(agentOrders);
    }

    @GetMapping("/pending-confirmations")
    public ResponseEntity<?> getPendingConfirmations(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        // Assignments waiting for this partner to confirm/reject
        List<DeliveryAssignment> pending = assignmentRepository
                .findByDeliveryPartnerIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(a -> "PENDING_CONFIRMATION".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(pending);
    }

    @GetMapping("/history")
    public ResponseEntity<?> getDeliveryHistory(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        List<Order> history = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .collect(Collectors.toList());

        return ResponseEntity.ok(history);
    }

    @GetMapping("/orders/{orderId}/customer-contact")
    public ResponseEntity<?> getCustomerContact(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null || !user.hasRole(Role.DELIVERY_PARTNER)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only delivery partners can access this endpoint."));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Order not found"));
        }

        boolean isAssigned = (order.getDeliveryAgent() != null
                && order.getDeliveryAgent().getUser() != null
                && order.getDeliveryAgent().getUser().getId().equals(user.getId()))
                || (order.getSelectedDeliveryPartnerId() != null
                && order.getSelectedDeliveryPartnerId().equals(user.getId()));

        if (!isAssigned) {
            return ResponseEntity.status(403).body(Map.of("error", "You are not assigned to this order."));
        }

        String custName = order.getCustomerName() != null ? order.getCustomerName()
                : (order.getUser() != null ? order.getUser().getName() : "Customer");
        String custPhone = order.getRawCustomerPhone() != null ? order.getRawCustomerPhone()
                : (order.getUser() != null ? order.getUser().getPhone() : "");
        String deadline = order.getDeliveryDeadline() != null ? order.getDeliveryDeadline()
                : (order.getDeadlineMinutes() != null ? order.getDeadlineMinutes() + " Mins" : "ASAP");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("customerName", custName);
        response.put("phone", custPhone);
        response.put("deliveryLocation", order.getDeliveryLocation());
        response.put("deliveryInstructions", order.getDeliveryInstructions() != null ? order.getDeliveryInstructions() : "");
        response.put("deliveryDeadline", deadline);

        return ResponseEntity.ok(response);
    }

    /** Kitchen contact is intentionally limited to the courier selected for this order. */
    @GetMapping("/orders/{orderId}/pickup-contact")
    public ResponseEntity<?> getPickupContact(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        User courier = userRepository.findById(userDetails.getId()).orElse(null);
        Order order = orderRepository.findById(orderId).orElse(null);
        if (courier == null || order == null || !courier.hasRole(Role.DELIVERY_PARTNER) || !isAssignedTo(order, courier)) {
            return ResponseEntity.status(403).body(Map.of("error", "Kitchen contact is available only to the assigned delivery partner."));
        }

        User manager = order.getShop() != null && order.getShop().getManagerUserId() != null
                ? userRepository.findById(order.getShop().getManagerUserId()).orElse(null) : null;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("shopName", order.getShop() != null ? order.getShop().getName() : "Campus Canteen");
        response.put("pickupLocation", order.getShop() != null && order.getShop().getLocation() != null
                ? order.getShop().getLocation() : "Campus Canteen Counter");
        response.put("managerName", manager != null ? manager.getName() : "Canteen Manager");
        response.put("managerPhone", manager != null && manager.getPhone() != null ? manager.getPhone() : "");
        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/orders/{orderId}/pickup", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<?> pickupOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getDeliveryAgent() == null) {
            DeliveryAgent agent = getOrCreateAgent(user);
            order.setDeliveryAgent(agent);
            order.setSelectedDeliveryPartnerId(user.getId());
        } else if (!isAssignedTo(order, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Pickup is allowed only for your assigned delivery"));
        }

        boolean isReady = "READY_FOR_PICKUP".equalsIgnoreCase(order.getPreparationStatus()) || order.getOrderStatus() == OrderStatus.READY_FOR_PICKUP;
        if (!isReady) {
            return ResponseEntity.status(400).body(Map.of(
                    "message", "Order is not ready for pickup yet. Please wait for the manager/kitchen to finish preparation."
            ));
        }

        String oldStatus = order.getOrderStatus().name();
        order.setOrderStatus(OrderStatus.PICKED_UP);
        order.setDeliveryStatus("PICKED_UP");
        order.setPickupVerifiedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        biddingService.recordStatusHistory(orderId, oldStatus, OrderStatus.PICKED_UP.name(), user.getName(), "Picked up from canteen by delivery partner");
        eventPublisher.publishOrderStatusChanged(orderId, OrderStatus.PICKED_UP.name(), updated);

        log.info("Delivery agent {} picked up order {}", user.getEmail(), order.getOrderNumber());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/orders/{orderId}/out-for-delivery")
    public ResponseEntity<?> markOutForDelivery(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!isAssignedTo(order, user) || (order.getOrderStatus() != OrderStatus.PICKED_UP && !"PICKED_UP".equalsIgnoreCase(order.getDeliveryStatus()))) {
            return ResponseEntity.status(403).body(Map.of("message", "Order must be picked up by the assigned partner first"));
        }

        String oldStatus = order.getOrderStatus().name();
        order.setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
        order.setDeliveryStatus("OUT_FOR_DELIVERY");
        Order updated = orderRepository.save(order);

        biddingService.recordStatusHistory(orderId, oldStatus, OrderStatus.OUT_FOR_DELIVERY.name(), user.getName(), "Out for delivery to customer");
        eventPublisher.publishOrderStatusChanged(orderId, OrderStatus.OUT_FOR_DELIVERY.name(), updated);

        log.info("Order {} is now OUT_FOR_DELIVERY by agent {}", order.getOrderNumber(), user.getEmail());
        return ResponseEntity.ok(updated);
    }

    @PostMapping({"/orders/{orderId}/verify-otp", "/orders/{orderId}/delivery-otp/verify"})
    public ResponseEntity<?> verifyDeliveryOtp(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!isAssignedTo(order, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the assigned delivery partner can verify OTP"));
        }

        String inputOtp = body.get("otp");
        if (inputOtp == null || order.getDeliveryOtp() == null || !inputOtp.trim().equals(order.getDeliveryOtp().trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid delivery OTP. Please ask the student for their 4-digit code."));
        }

        order.setDeliveryOtpVerified(true);
        orderRepository.save(order);
        return ResponseEntity.ok(Map.of("success", true, "message", "Delivery OTP verified successfully"));
    }

    @PostMapping({"/orders/{orderId}/proof", "/orders/{orderId}/deliver"})
    @Transactional
    public ResponseEntity<?> uploadDeliveryProofAndComplete(
            @PathVariable Long orderId,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "otp", required = false) String paramOtp,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!isAssignedTo(order, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the assigned delivery partner can complete this order"));
        }

        String inputOtp = paramOtp;
        if (inputOtp == null && body != null) {
            inputOtp = body.get("otp");
        }
        if (order.getDeliveryOtp() != null && !Boolean.TRUE.equals(order.getDeliveryOtpVerified())) {
            if (inputOtp == null || !inputOtp.trim().equals(order.getDeliveryOtp().trim())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Delivery OTP verification is required to complete this delivery"));
            }
            order.setDeliveryOtpVerified(true);
        }

        String proofFilename = null;
        if (file != null && !file.isEmpty()) {
            proofFilename = storageService.storeFile(file);
        } else if (body != null && body.containsKey("proofFilename")) {
            proofFilename = body.get("proofFilename");
        }

        String oldStatus = order.getOrderStatus().name();
        order.setDeliveryProofPath(proofFilename);
        order.setOrderStatus(OrderStatus.DELIVERED);
        order.setDeliveryStatus("DELIVERED");
        order.setDeliveredAt(LocalDateTime.now());
        order.setPaymentStatus("PAID");
        Order updated = orderRepository.save(order);

        // Reset partner status to AVAILABLE
        DeliveryAgent agent = getOrCreateAgent(user);
        agent.setAvailabilityStatus("AVAILABLE");
        deliveryAgentRepository.save(agent);

        // Record status history & credit earning
        biddingService.recordStatusHistory(orderId, oldStatus, OrderStatus.DELIVERED.name(), user.getName(),
                proofFilename != null ? "Delivered to customer with OTP verification and photo proof" : "Delivered to customer with OTP verification");
        eventPublisher.publishOrderStatusChanged(orderId, OrderStatus.DELIVERED.name(), updated);

        Double earningAmount = order.getDeliveryFee() != null ? order.getDeliveryFee().doubleValue() : 15.0;
        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(user.getId());
        double currentBalance = txns.isEmpty() ? 0.0 : txns.get(0).getBalanceAfter();
        double newBalance = currentBalance + earningAmount;

        WalletTransaction creditTxn = WalletTransaction.builder()
                .deliveryPartnerId(user.getId())
                .orderId(orderId)
                .type("DELIVERY_EARNING")
                .amount(earningAmount)
                .description("Delivery earning payout for Order #" + order.getOrderNumber())
                .balanceAfter(newBalance)
                .timestamp(LocalDateTime.now())
                .build();
        walletTransactionRepository.save(creditTxn);

        log.info("Order {} marked DELIVERED and credited ₹{} to partner {}", order.getOrderNumber(), earningAmount, user.getEmail());
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDeliveryStats(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!isApprovedDeliveryPartner(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Delivery partner approval required"));
        }

        List<Order> allAgentOrders = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> deliveredOrders = allAgentOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED || o.getOrderStatus() == OrderStatus.COMPLETED)
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<Order> todayDeliveries = deliveredOrders.stream()
                .filter(o -> o.getDeliveredAt() != null && o.getDeliveredAt().toLocalDate().isEqual(today))
                .collect(Collectors.toList());

        long activeCount = allAgentOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.ASSIGNED
                        || o.getOrderStatus() == OrderStatus.DELIVERY_ASSIGNED
                        || o.getOrderStatus() == OrderStatus.PICKED_UP
                        || o.getOrderStatus() == OrderStatus.OUT_FOR_DELIVERY)
                .count();

        BigDecimal todayEarnings = deliveredOrders.stream()
                .filter(o -> o.getDeliveredAt() != null && o.getDeliveredAt().toLocalDate().isEqual(today))
                .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : earningPerDelivery)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEarnings = deliveredOrders.stream()
                .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : earningPerDelivery)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Double avgRating = reviewRepository.averageRatingForPartner(user.getId());
        double partnerRating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 4.9;
        int reviewCount = reviewRepository.findByDeliveryPartnerId(user.getId()).size();

        return ResponseEntity.ok(Map.of(
                "todayDeliveries", todayDeliveries.size(),
                "totalDeliveries", deliveredOrders.size(),
                "activeDeliveries", activeCount,
                "todayEarnings", todayEarnings,
                "totalEarnings", totalEarnings,
                "earningPerDelivery", earningPerDelivery,
                "rating", partnerRating,
                "reviewCount", reviewCount
        ));
    }

    @GetMapping("/proof/{filename}")
    public ResponseEntity<?> getDeliveryProofImage(@PathVariable String filename) {
        try {
            org.springframework.core.io.Resource resource = storageService.loadFileAsResource(filename);
            String contentType = "image/jpeg";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".png")) {
                contentType = "image/png";
            } else if (lower.endsWith(".webp")) {
                contentType = "image/webp";
            }
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
