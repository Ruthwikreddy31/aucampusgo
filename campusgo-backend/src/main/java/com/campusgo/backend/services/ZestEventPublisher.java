package com.campusgo.backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZestEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishDeliveryRequestCreated(Object request) {
        try {
            Object payload = Map.of(
                    "event", "delivery_request_created",
                    "data", request
            );
            messagingTemplate.convertAndSend("/topic/delivery-requests", payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event delivery_request_created: {}", e.getMessage());
        }
    }

    public void publishBidSubmitted(Long requestId, Object bid) {
        try {
            Object payload = Map.of(
                    "event", "bid_submitted",
                    "data", bid
            );
            messagingTemplate.convertAndSend("/topic/bids/" + requestId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event bid_submitted: {}", e.getMessage());
        }
    }

    public void publishTopBidsReady(Long requestId, Object topBids) {
        try {
            Object payload = Map.of(
                    "event", "top_bids_ready",
                    "data", topBids
            );
            messagingTemplate.convertAndSend("/topic/bids/" + requestId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event top_bids_ready: {}", e.getMessage());
        }
    }

    public void publishBiddingClosed(Long requestId, Object topBids) {
        try {
            Object payload = Map.of(
                    "event", "bidding_closed",
                    "data", topBids
            );
            messagingTemplate.convertAndSend("/topic/bids/" + requestId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event bidding_closed: {}", e.getMessage());
        }
    }

    public void publishPartnerSelected(Long requestId, Object assignment) {
        try {
            Object payload = Map.of(
                    "event", "delivery_partner_selected",
                    "data", assignment
            );
            messagingTemplate.convertAndSend("/topic/bids/" + requestId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event delivery_partner_selected: {}", e.getMessage());
        }
    }

    public void publishAssignmentSentToPartner(Long partnerId, Object assignment) {
        try {
            Object payload = Map.of(
                    "event", "delivery_assignment_sent",
                    "data", assignment
            );
            messagingTemplate.convertAndSend("/topic/assignments/" + partnerId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event delivery_assignment_sent: {}", e.getMessage());
        }
    }

    public void publishOrderStatusChanged(Long orderId, String newStatus, Object orderDetails) {
        try {
            Object payload = Map.of(
                    "event", "order_status_changed",
                    "status", newStatus,
                    "data", orderDetails
            );
            messagingTemplate.convertAndSend("/topic/orders/" + orderId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event order_status_changed: {}", e.getMessage());
        }
    }

    public void publishDeliveryLocationUpdated(Long orderId, Double latitude, Double longitude) {
        try {
            Object payload = Map.of(
                    "event", "delivery_location_updated",
                    "latitude", latitude,
                    "longitude", longitude
            );
            messagingTemplate.convertAndSend("/topic/orders/" + orderId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket event delivery_location_updated: {}", e.getMessage());
        }
    }

    public void publishUserNotification(Long userId, Object notification) {
        try {
            Object payload = Map.of(
                    "event", "notification",
                    "data", notification
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, payload);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket notification: {}", e.getMessage());
        }
    }
}
