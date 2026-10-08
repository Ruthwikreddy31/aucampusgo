package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Order;
import com.campusgo.backend.models.OrderStatus;
import com.campusgo.backend.models.Review;
import com.campusgo.backend.repositories.OrderRepository;
import com.campusgo.backend.repositories.ReviewRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    @PostMapping("/api/orders/{orderId}/reviews")
    public ResponseEntity<?> submitReview(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!order.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the customer can rate this delivery"));
        }
        if (order.getOrderStatus() != OrderStatus.DELIVERED && order.getOrderStatus() != OrderStatus.COMPLETED) {
            return ResponseEntity.badRequest().body(Map.of("message", "You can rate only after the order is delivered"));
        }
        if (reviewRepository.findByOrderIdAndCustomerId(orderId, userDetails.getId()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("message", "You have already reviewed this order"));
        }

        int rating = Integer.parseInt(body.getOrDefault("rating", 5).toString());
        rating = Math.max(1, Math.min(5, rating));
        String comment = body.get("comment") != null ? body.get("comment").toString().trim() : null;

        Long partnerId = null;
        if (order.getDeliveryAgent() != null && order.getDeliveryAgent().getUser() != null) {
            partnerId = order.getDeliveryAgent().getUser().getId();
        } else if (order.getDeliveryAgent() != null) {
            partnerId = order.getDeliveryAgent().getId();
        }
        if (partnerId == null && order.getSelectedDeliveryPartnerId() != null) {
            partnerId = order.getSelectedDeliveryPartnerId();
        }

        Review review = reviewRepository.save(Review.builder()
                .orderId(orderId)
                .customerId(userDetails.getId())
                .deliveryPartnerId(partnerId)
                .rating(rating)
                .comment(comment)
                .build());

        // Keep order as DELIVERED so courier stats and earnings remain consistent
        if (order.getOrderStatus() != OrderStatus.DELIVERED) {
            order.setOrderStatus(OrderStatus.DELIVERED);
            orderRepository.save(order);
        }

        return ResponseEntity.ok(review);
    }

    @GetMapping("/api/orders/{orderId}/reviews")
    public ResponseEntity<?> getReview(@PathVariable Long orderId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        return reviewRepository.findByOrderId(orderId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(Map.of()));
    }

    @GetMapping("/api/delivery/reviews")
    public ResponseEntity<?> getDeliveryPartnerReviews(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        List<Review> reviews = reviewRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(userDetails.getId());
        Double avgRating = reviewRepository.averageRatingForPartner(userDetails.getId());
        double roundedRating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 5.0;

        return ResponseEntity.ok(Map.of(
                "reviews", reviews,
                "averageRating", roundedRating,
                "totalReviews", reviews.size()
        ));
    }
}
