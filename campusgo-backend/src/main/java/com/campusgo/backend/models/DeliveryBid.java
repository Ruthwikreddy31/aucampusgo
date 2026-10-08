package com.campusgo.backend.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_bids", indexes = {
    @Index(name = "idx_bid_request", columnList = "request_id"),
    @Index(name = "idx_bid_partner", columnList = "delivery_partner_id"),
    @Index(name = "idx_bid_order", columnList = "order_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_bid_request_partner", columnNames = {"request_id", "delivery_partner_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryBid extends BaseEntity {

    @Column(name = "request_id", nullable = false)
    private Long requestId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "delivery_partner_id", nullable = false)
    private Long deliveryPartnerId;

    private String deliveryPartnerName;

    @Builder.Default
    private Double rating = 4.8;

    @Builder.Default
    private Integer completedDeliveries = 45;

    @Column(nullable = false)
    private Double amount;

    @Builder.Default
    private Integer estimatedPickupTimeMinutes = 3;

    @Builder.Default
    private Integer estimatedDeliveryTimeMinutes = 5;

    private LocalDateTime submittedAt;

    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, SELECTED, NOT_SELECTED, EXPIRED, CANCELLED

    @Column(length = 500)
    private String message;

    @JsonProperty("deliveryPartnerRating")
    public Double getDeliveryPartnerRating() {
        return rating;
    }

    @JsonProperty("deliveryPartnerCompletedDeliveries")
    public Integer getDeliveryPartnerCompletedDeliveries() {
        return completedDeliveries;
    }
}
