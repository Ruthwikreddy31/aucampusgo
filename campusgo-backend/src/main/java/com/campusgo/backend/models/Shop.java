package com.campusgo.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "shops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shop extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(length = 500)
    private String description;

    private String imageUrl;

    private Integer preparationTime;

    private Double rating;

    private String location;

    private Long managerUserId;

    @Column(nullable = false)
    @Builder.Default
    private boolean open = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
