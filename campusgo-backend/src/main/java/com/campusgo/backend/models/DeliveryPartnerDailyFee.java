package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_partner_daily_fees", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"delivery_partner_id", "fee_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryPartnerDailyFee extends BaseEntity {

    @Column(name = "delivery_partner_id", nullable = false)
    private Long deliveryPartnerId;

    @Column(name = "fee_date", nullable = false)
    private LocalDate feeDate;

    @Column(nullable = false)
    private Double amount;

    @Builder.Default
    private String status = "PAID";

    private LocalDateTime paidAt;
}