package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRequest extends BaseEntity {

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    private String customerName;

    private String deliveryLocation;

    private String shopName;

    private Integer deadlineMinutes;

    private LocalDateTime deadlineAt;

    private LocalDateTime bidStartAt;

    private LocalDateTime bidEndAt;

    private Double orderTotal;

    @Builder.Default
    @Column(nullable = false)
    private String status = "OPEN"; // OPEN, BIDDING_CLOSED, SELECTION_PENDING, ASSIGNED, EXPIRED, CANCELLED, COMPLETED

    private Long selectedBidId;
}