package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppNotification extends BaseEntity {

    @Column(nullable = false)
    private Long userId;

    private Long orderId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String type;

    @Builder.Default
    @Column(name = "is_read")
    private boolean read = false;
}
