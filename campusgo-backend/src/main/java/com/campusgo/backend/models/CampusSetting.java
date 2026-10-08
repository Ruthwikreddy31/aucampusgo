package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "campus_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampusSetting extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String settingKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String settingValue;

    private String description;
}
