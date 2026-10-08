package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAssignment extends BaseEntity {

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "delivery_partner_id", nullable = false)
    private Long deliveryPartnerId;

    @Column(name = "bid_id", nullable = false)
    private Long bidId;

    private LocalDateTime assignedAt;

    private LocalDateTime expiresAt;

    private LocalDateTime confirmedAt;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING_CONFIRMATION"; // PENDING_CONFIRMATION, CONFIRMED, REJECTED, EXPIRED, CANCELLED, COMPLETED
}
