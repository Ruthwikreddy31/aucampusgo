package com.campusgo.backend.controllers;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.DeliveryRequestRepository;
import com.campusgo.backend.repositories.OrderRepository;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.ZestBiddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Slf4j
public class BiddingController {

    private final ZestBiddingService biddingService;
    private final OrderRepository orderRepository;
    private final DeliveryRequestRepository requestRepository;
    private final com.campusgo.backend.repositories.DeliveryBidRepository bidRepository;
    private final UserRepository userRepository;
    private final WalletController walletController;

    // ──────────────────────────────────────────────────────────────────────────
    // DELIVERY REQUEST CREATION & RETRIEVAL
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping({"/api/bidding/orders/{orderId}/request", "/api/orders/{orderId}/delivery-request", "/api/delivery-requests/orders/{orderId}"})
    public ResponseEntity<?> createDeliveryRequest(
            @PathVariable Long orderId,
            @RequestBody(required = false) Map<String, Integer> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with id: " + orderId));

        if (userDetails != null && !order.getUser().getId().equals(userDetails.getId()) && !userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        Integer deadlineMinutes = (body != null && body.containsKey("deadlineMinutes")) ? body.get("deadlineMinutes") : order.getDeadlineMinutes();
        if (deadlineMinutes == null) deadlineMinutes = 5;

        DeliveryRequest request = biddingService.createDeliveryRequest(order, deadlineMinutes);
        return ResponseEntity.ok(request);
    }

    @GetMapping({"/api/bidding/requests/{id}", "/api/delivery-requests/{id}"})
    public ResponseEntity<?> getDeliveryRequestById(@PathVariable Long id) {
        return requestRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping({"/api/bidding/orders/{orderId}/request", "/api/delivery-requests/order/{orderId}"})
    public ResponseEntity<?> getDeliveryRequestByOrderId(@PathVariable Long orderId) {
        return requestRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping({"/api/bidding/requests/open", "/api/delivery-requests/open"})
    public ResponseEntity<?> getOpenDeliveryRequests(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails != null) {
            User user = userRepository.findById(userDetails.getId()).orElse(null);
            if (user != null && user.hasRole(Role.DELIVERY_PARTNER)) {
                if (!biddingService.isEligiblePartner(user)) {
                    return ResponseEntity.ok(List.of());
                }
            }
        }
        return ResponseEntity.ok(requestRepository.findByStatusOrderByCreatedAtDesc("OPEN"));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELIVERY PARTNER SEALED BIDDING
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping({"/api/bidding/requests/{requestId}/bids", "/api/delivery-requests/{requestId}/bids", "/api/bidding/bids"})
    public ResponseEntity<?> submitBid(
            @PathVariable(required = false) Long requestId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        User partnerUser = userRepository.findById(userDetails.getId()).orElseThrow();
        if (!partnerUser.hasRole(Role.DELIVERY_PARTNER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only delivery partners can submit delivery bids"));
        }
        if (!biddingService.isEligiblePartner(partnerUser)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only Admin-approved and ACTIVE delivery partners can participate in bidding."));
        }

        Long targetRequestId = requestId;
        if (targetRequestId == null && body.containsKey("requestId")) {
            targetRequestId = Long.valueOf(body.get("requestId").toString());
        } else if (targetRequestId == null && body.containsKey("orderId")) {
            Long orderId = Long.valueOf(body.get("orderId").toString());
            targetRequestId = requestRepository.findByOrderId(orderId).map(BaseEntity::getId).orElseGet(() -> {
                Order ord = orderRepository.findById(orderId).orElse(null);
                if (ord != null) {
                    DeliveryRequest newReq = biddingService.createDeliveryRequest(ord, ord.getDeadlineMinutes() != null ? ord.getDeadlineMinutes() : 5);
                    return newReq.getId();
                }
                return null;
            });
        }

        if (targetRequestId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request ID or Order ID is required"));
        }

        Double amount = Double.valueOf(body.get("amount").toString());
        Integer estPickup = body.containsKey("estimatedPickupTimeMinutes") ? Integer.valueOf(body.get("estimatedPickupTimeMinutes").toString()) : null;
        Integer estDelivery = body.containsKey("estimatedDeliveryTimeMinutes") ? Integer.valueOf(body.get("estimatedDeliveryTimeMinutes").toString()) : null;

        try {
            DeliveryBid bid = biddingService.submitBid(targetRequestId, partnerUser, amount, estPickup, estDelivery);
            return ResponseEntity.ok(bid);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping({"/api/bidding/requests/{requestId}/top-bids", "/api/delivery-requests/{requestId}/bids/top"})
    public ResponseEntity<List<DeliveryBid>> getTop5LowestBids(@PathVariable Long requestId) {
        List<DeliveryBid> topBids = biddingService.getTop5LowestBids(requestId);
        return ResponseEntity.ok(topBids);
    }

    @GetMapping({"/api/bidding/orders/{orderId}/top-bids", "/api/bidding/orders/{orderId}/bids"})
    public ResponseEntity<List<DeliveryBid>> getTop5LowestBidsByOrderId(@PathVariable Long orderId) {
        DeliveryRequest req = requestRepository.findByOrderId(orderId).orElse(null);
        if (req != null) {
            List<DeliveryBid> topBids = biddingService.getTop5LowestBids(req.getId());
            if (!topBids.isEmpty()) {
                return ResponseEntity.ok(topBids);
            }
        }
        // Direct order bids lookup fallback
        List<DeliveryBid> directBids = bidRepository.findByOrderId(orderId);
        if (directBids != null && !directBids.isEmpty()) {
            List<DeliveryBid> active = directBids.stream()
                    .filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus()) || "SELECTED".equalsIgnoreCase(b.getStatus()))
                    .sorted(java.util.Comparator.comparing(DeliveryBid::getAmount)
                            .thenComparing(DeliveryBid::getEstimatedDeliveryTimeMinutes, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                    .limit(5)
                    .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(active);
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/api/delivery-requests/{requestId}/bids")
    public ResponseEntity<List<DeliveryBid>> getCustomerVisibleBids(@PathVariable Long requestId) {
        return ResponseEntity.ok(biddingService.getTop5LowestBids(requestId));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CUSTOMER PARTNER SELECTION & ASSIGNMENT
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping({
        "/api/bidding/requests/{requestId}/select-bid/{bidId}",
        "/api/delivery-requests/{requestId}/select-partner",
        "/api/bidding/orders/{orderId}/select-bid",
        "/api/orders/{orderId}/select-bid/{bidId}",
        "/api/orders/{orderId}/select-partner/{bidId}"
    })
    public ResponseEntity<?> selectPartner(
            @PathVariable(required = false) Long requestId,
            @PathVariable(required = false) Long bidId,
            @PathVariable(required = false) Long orderId,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User customerUser = userRepository.findById(userDetails.getId()).orElseThrow();

        Long targetRequestId = requestId;
        Long targetBidId = bidId;

        if (targetBidId == null && body != null && body.containsKey("bidId")) {
            targetBidId = Long.valueOf(body.get("bidId").toString());
        }

        if (targetRequestId == null && orderId != null) {
            targetRequestId = requestRepository.findByOrderId(orderId).map(BaseEntity::getId).orElse(null);
        } else if (targetRequestId == null && body != null && body.containsKey("requestId")) {
            targetRequestId = Long.valueOf(body.get("requestId").toString());
        }

        if (targetRequestId == null || targetBidId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request ID and Bid ID are required"));
        }

        try {
            DeliveryAssignment assignment = biddingService.selectPartner(targetRequestId, targetBidId, customerUser);
            return ResponseEntity.ok(assignment);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping({"/api/delivery-assignments/{assignmentId}/confirm", "/api/delivery-assignments/{assignmentId}/accept"})
    public ResponseEntity<?> confirmAssignment(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User partnerUser = userRepository.findById(userDetails.getId()).orElseThrow();

        try {
            Order updatedOrder = biddingService.confirmAssignment(assignmentId, partnerUser);
            return ResponseEntity.ok(updatedOrder);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/delivery-assignments/{assignmentId}/reject")
    public ResponseEntity<?> rejectAssignment(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User partnerUser = userRepository.findById(userDetails.getId()).orElseThrow();

        try {
            biddingService.rejectAssignment(assignmentId, partnerUser);
            return ResponseEntity.ok(Map.of("success", true, "message", "Assignment rejected successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping({"/api/bidding/courier/{partnerId}/wallet", "/api/bidding/partner/{partnerId}/wallet"})
    public ResponseEntity<?> getCourierWallet(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return walletController.getWallet(partnerId, userDetails);
    }
}
