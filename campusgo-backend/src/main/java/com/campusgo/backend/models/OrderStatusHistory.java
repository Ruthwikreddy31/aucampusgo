package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusHistory extends BaseEntity {

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    private String oldStatus;

    @Column(nullable = false)
    private String newStatus;

    private String changedBy;

    @Column(columnDefinition = "TEXT")
    private String metadata;
}
