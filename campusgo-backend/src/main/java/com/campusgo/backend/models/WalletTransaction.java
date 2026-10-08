package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletTransaction extends BaseEntity {

    @Column(name = "delivery_partner_id", nullable = false)
    private Long deliveryPartnerId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Double amount;

    private Long orderId;

    private String description;

    private Double balanceAfter;

    private LocalDateTime timestamp;
}