package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review extends BaseEntity {

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private Long customerId;

    private Long deliveryPartnerId;

    @Column(nullable = false)
    private Integer rating;

    @Column(length = 1000)
    private String comment;
}
